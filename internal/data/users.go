package data

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/RickinShah/BugBee/internal/validator"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrDuplicateEmail    = errors.New("duplicate email")
	ErrDuplicateUsername = errors.New("duplicate username")
)

const (
	userCacheDuration  = 30 * time.Minute
	tokenCacheDuration = 30 * time.Minute
)

var AnonymousUser = &User{}

type User struct {
	ID         int64     `json:"user_id,string" db:"user_pid"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	Name       *string   `json:"name" db:"name"`
	Username   string    `json:"username" db:"username"`
	Email      string    `json:"email" db:"email"`
	Password   password  `json:"password" db:"password"`
	Activated  bool      `json:"activated" db:"activated"`
	Bio        *string   `json:"bio" db:"bio"`
	ProfilePic bool      `json:"profile_pic" db:"profile_pic"`
	ShowNsfw   bool      `json:"show_nsfw" db:"show_nsfw"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
	Version    int32     `json:"version" db:"version"`
	all        bool
}

type password struct {
	plaintext *string
	Hash      []byte `json:"password_hash" db:"password_hash"`
}

func (u *User) MarshalJSON() ([]byte, error) {
	user := make(map[string]any, 11)
	user["user_id"] = strconv.FormatInt(u.ID, 10)
	user["name"] = u.Name
	user["email"] = u.Email
	user["username"] = u.Username
	user["bio"] = u.Bio
	user["show_nsfw"] = u.ShowNsfw
	user["profile_pic"] = u.ProfilePic
	if u.all {
		user["activated"] = u.Activated
		user["created_at"] = u.CreatedAt
		user["version"] = u.Version
		user["password"] = u.Password
		user["updated_at"] = u.UpdatedAt
	}

	return json.Marshal(user)
}

func (u *User) SetIncludeAll(include bool) {
	u.all = include
}

func (u *User) IsAnonymous() bool {
	return u == AnonymousUser
}

func (p *password) Set(plainTextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plainTextPassword), 12)
	if err != nil {
		return err
	}

	p.plaintext = &plainTextPassword
	p.Hash = hash

	return nil
}

func (p *password) Matches(plainTextPassword string) (bool, error) {
	err := bcrypt.CompareHashAndPassword(p.Hash, []byte(plainTextPassword))

	if err != nil {
		switch {
		case errors.Is(err, bcrypt.ErrMismatchedHashAndPassword):
			return false, nil
		default:
			return false, err
		}
	}

	return true, nil
}

func ValidateEmail(v *validator.Validator, email string) {
	v.Check(email != "", "email", "must be provided")
	v.Check(validator.Matches(email, validator.EmailRX), "email", "must be a valid email address")
}

func ValidateConfirmPassword(v *validator.Validator, password string, confirmPassword string) {
	v.Check(password != "", "password", "must be provided")
	v.Check(confirmPassword != "", "confirm password", "must be provided")
	v.Check(password == confirmPassword, "password", "doesn't match")
}

func ValidatePasswordPlainText(v *validator.Validator, password string) {
	v.Check(password != "", "password", "must be provided")
	v.Check(len(password) >= 8, "password", "must not be less than 8 characters")
	v.Check(len(password) <= 72, "password", "must not be more than 72 characters")
}

func ValidateBio(v *validator.Validator, bio string) {
	v.Check(len(bio) <= 150, "bio", "must not be more than 150 bytes")
}

func ValidateUsername(v *validator.Validator, username string) {
	v.Check(username != "", "username", "must be provided")
	v.Check(len(username) <= 30, "username", "must not be more than 30 characters")
	v.Check(validator.Matches(username, validator.UsernameRX), "username", "should only contain alphanumeric characters and underscore")
}

func ValidateUsernameOrEmail(v *validator.Validator, username string) {
	v.Check(username != "", "username/email", "must be provided")
	v.Check(validator.Matches(username, validator.UsernameEmailRX), "username/email", "is not valid")
}

func ValidateName(v *validator.Validator, name string) {
	v.Check(len(name) <= 50, "name", "must not be more than 500 characters")
}

func ValidateUser(v *validator.Validator, user *User) {
	if user.Name != nil {
		ValidateName(v, *user.Name)
	}
	ValidateEmail(v, user.Email)
	ValidateUsername(v, user.Username)
	if user.Bio != nil {
		ValidateBio(v, *user.Bio)
	}

	if user.Password.plaintext != nil {
		ValidatePasswordPlainText(v, *user.Password.plaintext)
	}

	if user.Password.Hash == nil {
		panic("missing password Hash for user")
	}
}

type UserModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m UserModel) Insert(user *User) error {
	query := `
		INSERT INTO users (name, username, email, password_hash, activated, bio)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING user_pid, created_at, version`

	args := []any{user.Name, user.Username, user.Email, user.Password.Hash, user.Activated, user.Bio}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&user.ID, &user.CreatedAt, &user.Version)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
			return ErrDuplicateEmail
		case err.Error() == `pq: duplicate key value violates unique constraint "users_username_key"`:
			return ErrDuplicateUsername
		default:
			return err
		}
	}

	go func(user User) {
		user.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(user.Username), &user, userCacheDuration)
	}(*user)

	return nil
}

func (m UserModel) GetByUsername(username string) (*User, error) {
	dataJSON, err := CacheGet(m.Redis, m.generateCacheKey(username))
	if nil == err {
		var user User
		err := json.Unmarshal([]byte(dataJSON), &user)
		if nil == err {
			return &user, nil
		}
	}

	query := `
		SELECT user_pid, created_at, name, username, email, password_hash, activated, bio, show_nsfw, profile_pic, updated_at, version
		FROM users
		WHERE username = $1`

	user := User{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{username}
	err = m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Username,
		&user.Email,
		&user.Password.Hash,
		&user.Activated,
		&user.Bio,
		&user.ShowNsfw,
		&user.ProfilePic,
		&user.UpdatedAt,
		&user.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(user User) {
		user.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(user.Username), &user, userCacheDuration)
	}(user)

	return &user, nil
}

func (m UserModel) GetByEmailOrUsername(email string, username string) (*User, error) {
	dataJSON, err := CacheGet(m.Redis, m.generateCacheKey(username))
	if nil == err {
		var user User
		err := json.Unmarshal([]byte(dataJSON), &user)
		if nil == err {
			return &user, nil
		}
	}

	query := `
		SELECT user_pid, created_at, name, username, email, password_hash, activated, bio, show_nsfw, profile_pic, updated_at, version
		FROM users
		WHERE email = $1 OR username = $2`

	var user User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{email, username}
	err = m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Username,
		&user.Email,
		&user.Password.Hash,
		&user.Activated,
		&user.Bio,
		&user.ShowNsfw,
		&user.ProfilePic,
		&user.UpdatedAt,
		&user.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(user User) {
		user.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(user.Username), &user, userCacheDuration)
	}(user)

	return &user, nil
}

func (m UserModel) Update(user *User, token ...string) error {
	query := `
		UPDATE users
		SET name = $1, username = $2, email = $3, password_hash = $4, activated = $5, bio = $6, show_nsfw = $7,
			profile_pic = $8, updated_at = now(), version = version + 1
		WHERE user_pid = $9 AND version = $10
		RETURNING version`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{
		user.Name,
		user.Username,
		user.Email,
		user.Password.Hash,
		user.Activated,
		user.Bio,
		user.ShowNsfw,
		user.ProfilePic,
		user.ID,
		user.Version,
	}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&user.Version)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
			return ErrDuplicateEmail
		case err.Error() == `pq: duplicate key value violates unique constraint "users_username_key"`:
			return ErrDuplicateUsername
		case errors.Is(err, sql.ErrNoRows):
			return ErrRecordNotFound
		default:
			return err
		}
	}

	go func(user User) {
		user.SetIncludeAll(true)
		if len(token) >= 2 && token[0] != "" && token[1] != "" {
			tokenHash := sha256.Sum256([]byte(token[1]))
			CacheDel(m.Redis, m.generateCacheKeyForToken(token[0], tokenHash))
		}
		CacheDel(m.Redis, m.generateCacheKey(user.Username))
	}(*user)

	return nil
}

func (m UserModel) GetForToken(tokenScope, tokenPlaintext string) (*User, error) {
	tokenHash := sha256.Sum256([]byte(tokenPlaintext))

	userJSON, err := CacheGet(m.Redis, m.generateCacheKeyForToken(tokenScope, tokenHash))

	if nil == err {
		var user User
		err := json.Unmarshal([]byte(userJSON), &user)
		if nil == err {
			log.Printf("Cache: %x", string(tokenHash[:]))
			return &user, nil
		}
	}

	query := `
		SELECT users.user_pid, users.created_at, users.name, users.username, users.email, users.password_hash,
			   users.activated, users.version, users.show_nsfw, users.profile_pic, users.updated_at, users.bio, tokens.expiry
		FROM users
		INNER JOIN tokens
		ON users.user_pid = tokens.user_id
		WHERE tokens.Hash = $1
		AND tokens.scope = $2
		AND tokens.expiry > $3
	`

	args := []any{tokenHash[:], tokenScope, time.Now()}

	user := User{}
	token := Token{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err = m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Username,
		&user.Email,
		&user.Password.Hash,
		&user.Activated,
		&user.Version,
		&user.ShowNsfw,
		&user.ProfilePic,
		&user.UpdatedAt,
		&user.Bio,
		&token.Expiry,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(user User) {
		user.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(user.Username), &user, userCacheDuration)

		remainingTime := time.Until(token.Expiry)
		maxCacheDuration := tokenCacheDuration
		cacheDurationForToken := min(remainingTime, maxCacheDuration)

		if cacheDurationForToken <= 0 {
			return
		}

		CacheSet(m.Redis, m.generateCacheKeyForToken(tokenScope, tokenHash), &user, cacheDurationForToken)
	}(user)

	return &user, nil
}

func (m UserModel) generateCacheKey(username string) string {
	return fmt.Sprintf("user:%s", username)
}

func (m UserModel) generateCacheKeyForToken(tokenScope string, tokenHash [32]byte) string {
	return fmt.Sprintf("token:%s:%x", tokenScope, tokenHash)
}
