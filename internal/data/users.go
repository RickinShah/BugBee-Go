package data

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/RickinShah/BugBee/internal/helper"
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
	ID          int64       `json:"user_id,string" db:"user_pid" redis:"user_id"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at" redis:"created_at"`
	Name        *string     `json:"name" db:"name" redis:"name"`
	Username    string      `json:"username" db:"username" redis:"username"`
	Email       string      `json:"email" db:"email" redis:"email"`
	Password    password    `json:"password" db:"password" redis:"password"`
	Activated   bool        `json:"activated" db:"activated" redis:"activated"`
	Bio         *string     `json:"bio" db:"bio" redis:"bio"`
	ProfilePath *string     `json:"profile_path" db:"profile_path" redis:"profile_path"`
	ShowNsfw    bool        `json:"show_nsfw" db:"show_nsfw" redis:"show_nsfw"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at" redis:"updated_at"`
	Version     int32       `json:"version" db:"version" redis:"version"`
	marshalType MarshalType // 1 = include all, 2 = enough for the frontend, 3 = only profile and username, 4 = only id
}

type password struct {
	plaintext *string
	Hash      []byte `json:"password_hash" db:"password_hash" redis:"password_hash"`
}

type MarshalType int

const (
	Full     MarshalType = 1
	Frontend MarshalType = 2
	Minimal  MarshalType = 3
	IDOnly   MarshalType = 4
)

func (u *User) MarshalJSON() ([]byte, error) {
	user := make(map[string]any, 11)
	if u.marshalType == 0 {
		u.marshalType = Full
	}
	if u.marshalType == IDOnly || u.marshalType == Frontend || u.marshalType == Full {
		user["user_id"] = strconv.FormatInt(u.ID, 10)
	}
	if u.marshalType == Full || u.marshalType == Frontend || u.marshalType == Minimal {
		user["username"] = u.Username
		user["name"] = u.Name
		if u.ProfilePath == nil {
			user["profile_path"] = "/bugbee/profiles/default.png"
		} else {
			user["profile_path"] = u.ProfilePath
		}
	}
	if u.marshalType == Full || u.marshalType == Frontend {
		user["email"] = u.Email
		user["bio"] = u.Bio
		user["show_nsfw"] = u.ShowNsfw
	}
	if u.marshalType == Full {
		user["activated"] = u.Activated
		user["created_at"] = u.CreatedAt
		user["version"] = u.Version
		user["password"] = u.Password
		user["updated_at"] = u.UpdatedAt
	}

	return json.Marshal(user)
}

func (u User) BinaryMarshaler() ([]byte, error) {
	return json.Marshal(u)
}

func (u *User) SetMarshalType(marshalType MarshalType) { // 1 = include all, 2 = enough for the frontend, 3 = only profile and username
	u.marshalType = marshalType
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

func ValidateBioOrDescription(v *validator.Validator, bio string) {
	v.Check(len(bio) <= 300, "bio", "must not be more than 500 characters")
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
	v.Check(len(name) <= 50, "name", "must not be more than 50 characters")
}

func ValidateUser(v *validator.Validator, user *User) {
	if user.Name != nil {
		ValidateName(v, *user.Name)
	}
	ValidateEmail(v, user.Email)
	ValidateUsername(v, user.Username)
	if user.Bio != nil {
		ValidateBioOrDescription(v, *user.Bio)
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

	return nil
}

func (m UserModel) GetByUsername(username string) (*User, error) {
	cacheKey := m.generateCacheKey(username)
	cachedUser, err := m.GetCache(cacheKey)
	if nil == err && cachedUser != nil {
		return cachedUser, nil
	}

	query := `
		SELECT user_pid, created_at, name, username, email, password_hash, activated, bio, show_nsfw, profile_path, updated_at, version
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
		&user.ProfilePath,
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

	go m.InsertCache(cacheKey, &user)

	return &user, nil
}

func (m UserModel) GetByEmailOrUsername(email string, username string) (*User, error) {
	cacheKey := m.generateCacheKey(username)
	cachedUser, err := m.GetCache(cacheKey)
	if nil == err && cachedUser != nil {
		return cachedUser, nil
	}

	query := `
		SELECT user_pid, created_at, name, username, email, password_hash, activated, bio, show_nsfw, profile_path, updated_at, version
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
		&user.ProfilePath,
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

	go m.InsertCache(cacheKey, &user)

	return &user, nil
}

func (m UserModel) Update(user *User, token ...string) error {
	query := `
		UPDATE users
		SET name = $1, username = $2, email = $3, password_hash = $4, activated = $5, bio = $6, show_nsfw = $7,
			profile_path = $8, updated_at = now(), version = version + 1
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
		user.ProfilePath,
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

	go func(m UserModel, user User) {
		if len(token) >= 2 && token[0] != "" && token[1] != "" {
			tokenHash := sha256.Sum256([]byte(token[1]))
			CacheDel(m.Redis, m.generateCacheKeyForToken(token[0], tokenHash))
		}
		cacheKey := m.generateCacheKey(user.Username)
		CacheDel(m.Redis, cacheKey)
	}(m, *user)

	return nil
}

func (m UserModel) GetUsersByUsernameOrName(name string, limit int, username string) ([]User, error) {
	query := `
		WITH similarity_scores AS (
			SELECT username, name, profile_path,
			GREATEST(word_similarity(name, $1), word_similarity(username, $1)) AS match_similarity
			FROM users
			WHERE (name % $1 OR username % $1) AND username != $3
			ORDER BY match_similarity DESC
			LIMIT $2
		)
		SELECT username, name, profile_path, match_similarity
		FROM similarity_scores
		UNION ALL
		SELECT username, name, profile_path,
		GREATEST(word_similarity(username, $1), word_similarity(name, $1)) AS match_similarity
		FROM users
		WHERE NOT EXISTS (SELECT 1 FROM similarity_scores) AND username != $3
		AND (username ^@ $1 OR name ^@ $1)
		ORDER BY match_similarity DESC NULLS LAST
		LIMIT $2;
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{name, limit, username}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	type tempUser struct {
		Username        string  `json:"username" db:"username"`
		Name            *string `json:"name" db:"name"`
		ProfilePath     *string `json:"profile_path" db:"profile_path"`
		MatchSimilarity float64 `json:"match_similarity" db:"match_similarity"`
	}

	var users []User

	for rows.Next() {
		var temp tempUser
		if err := rows.Scan(
			&temp.Username,
			&temp.Name,
			&temp.ProfilePath,
			&temp.MatchSimilarity,
		); err != nil {
			return nil, err
		}
		users = append(users, User{
			Username:    temp.Username,
			Name:        temp.Name,
			ProfilePath: temp.ProfilePath,
			marshalType: 3,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (m UserModel) Delete(userID int64) error {
	query := `
		DELETE FROM users WHERE user_pid = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrEditConflict
	}
	return nil
}

func (m UserModel) GetForToken(tokenScope, tokenPlaintext string) (*User, error) {
	tokenHash := sha256.Sum256([]byte(tokenPlaintext))
	cacheKey := m.generateCacheKeyForToken(tokenScope, tokenHash)

	query := `
		SELECT users.user_pid, users.created_at, users.name, users.username, users.email, users.password_hash,
			   users.activated, users.version, users.show_nsfw, users.profile_path, users.updated_at, users.bio, tokens.expiry
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

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Username,
		&user.Email,
		&user.Password.Hash,
		&user.Activated,
		&user.Version,
		&user.ShowNsfw,
		&user.ProfilePath,
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

	go m.InsertCache(cacheKey, &user)

	return &user, nil
}

func (m UserModel) generateCacheKey(username string) string {
	return fmt.Sprintf("user:%s", username)
}

func (m UserModel) generateCacheKeyForToken(tokenScope string, tokenHash [32]byte) string {
	return fmt.Sprintf("token:%s:%x", tokenScope, tokenHash)
}

func (m UserModel) InsertCache(key string, user *User) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	userMap := map[string]any{
		"user_id":       user.ID,
		"username":      user.Username,
		"name":          helper.DereferString(user.Name),
		"email":         user.Email,
		"created_at":    user.CreatedAt,
		"password_hash": user.Password.Hash,
		"activated":     user.Activated,
		"bio":           helper.DereferString(user.Bio),
		"profile_path":  helper.DereferString(user.ProfilePath),
		"show_nsfw":     user.ShowNsfw,
		"updated_at":    user.UpdatedAt,
		"version":       user.Version,
	}
	if err := m.Redis.HSet(ctx, key, userMap).Err(); err != nil {
		logger.PrintError(err, nil)
	}

	if err := m.Redis.Expire(ctx, key, userCacheDuration).Err(); err != nil {
		logger.PrintError(err, nil)
	}

}

func (m UserModel) GetCache(key string) (*User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	userData, err := m.Redis.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, err
	} else if len(userData) == 0 {
		return nil, ErrRecordNotFound
	}

	userID, _ := strconv.ParseInt(userData["user_id"], 10, 64)
	createdAt, _ := time.Parse(time.RFC3339, userData["created_at"])
	updatedAt, _ := time.Parse(time.RFC3339, userData["updated_at"])
	activated, _ := strconv.ParseBool(userData["activated"])
	showNsfw, _ := strconv.ParseBool(userData["show_nsfw"])
	version, _ := strconv.ParseInt(userData["version"], 10, 32)
	name := helper.ToStringPointer(userData["name"])
	bio := helper.ToStringPointer(userData["bio"])
	profilePath := helper.ToStringPointer(userData["profile_path"])

	user := User{
		ID:        userID,
		Username:  userData["username"],
		Name:      name,
		Email:     userData["email"],
		CreatedAt: createdAt,
		Password: password{
			Hash: []byte(userData["password_hash"]),
		},
		Activated:   activated,
		Bio:         bio,
		ProfilePath: profilePath,
		ShowNsfw:    showNsfw,
		UpdatedAt:   updatedAt,
		Version:     int32(version),
	}

	return &user, nil
}
