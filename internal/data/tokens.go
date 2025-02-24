package data

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"encoding/json"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/RickinShah/BugBee/internal/validator"
)

const (
	ScopeActivation     = "activation"
	ScopeAuthentication = "authentication"
	ScopePasswordReset  = "password_reset"
	ScopePendingUser    = "pending_user"
)

type Token struct {
	Plaintext string    `json:"token"`
	Hash      []byte    `json:"hash"`
	UserID    int64     `json:"user_id"`
	Expiry    time.Time `json:"expiry"`
	Scope     string    `json:"scope"`
	all       bool
}

func (t *Token) MarshalJSON() ([]byte, error) {
	token := make(map[string]any, 5)
	token["token"] = t.Plaintext
	token["expiry"] = t.Expiry
	if t.all {
		delete(token, "token")
		token["hash"] = t.Hash
		token["user_id"] = t.UserID
		token["scope"] = t.Scope
	}
	return json.Marshal(token)
}

func generateToken(userID int64, ttl time.Duration, scope string) (*Token, error) {
	token := &Token{
		UserID: userID,
		Expiry: time.Now().Add(ttl),
		Scope:  scope,
	}

	randomBytes := make([]byte, 16)

	_, err := rand.Read(randomBytes)
	if err != nil {
		return nil, err
	}

	token.Plaintext = base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(randomBytes)

	hash := sha256.Sum256([]byte(token.Plaintext))
	token.Hash = hash[:]

	return token, nil
}

func ValidateTokenPlaintext(v *validator.Validator, tokenPlaintext string) {
	v.Check(tokenPlaintext != "", "token", "must be provided")
	v.Check(len(tokenPlaintext) == 26, "token", "must be 26 characters long")
}

type TokenModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m TokenModel) New(userID int64, ttl time.Duration, scope string) (*Token, error) {
	token, err := generateToken(userID, ttl, scope)
	if err != nil {
		return nil, err
	}

	err = m.Insert(token)
	return token, err
}

func (m TokenModel) Insert(token *Token) error {
	query := `
		INSERT INTO tokens (Hash, user_id, expiry, scope)
		VALUES ($1, $2, $3, $4)`

	args := []any{token.Hash, token.UserID, token.Expiry, token.Scope}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, args...)

	if err != nil {
		return err
	}

	return err
}

func (m TokenModel) DeleteAllForUser(scope string, userID int64) error {
	query := `
		DELETE FROM tokens
		WHERE scope = $1 AND user_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, scope, userID)
	return err
}
