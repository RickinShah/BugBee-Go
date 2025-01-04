package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/RickinShah/BugBee/internal/security"
	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
	"github.com/pquerna/otp/totp"
)

type OTP struct {
	ID        int64      `json:"user_pid" db:"user_pid"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	OTP       otpDetails `json:"otp" db:"otp"`
	Expiry    time.Time  `json:"expiry" db:"expiry"`
}

type otpDetails struct {
	Code      string `json:"-"`
	SecretKey string `json:"secret_key" db:"secret_key"`
}

func generateOTP(accountName string, ttl time.Duration, userID int64) (*OTP, error) {
	otp := &OTP{
		ID:        userID,
		CreatedAt: time.Now(),
		Expiry:    time.Now().Add(ttl),
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "BugBee",
		AccountName: accountName,
	})

	if err != nil {
		return nil, err
	}

	otp.OTP.SecretKey = key.Secret()
	otp.OTP.Code, err = totp.GenerateCodeCustom(otp.OTP.SecretKey, otp.CreatedAt, totp.ValidateOpts{
		Period: 60 * 15,
		Skew:   1,
		Digits: 6,
	})

	if err != nil {
		return nil, err
	}

	return otp, nil
}

func (o *otpDetails) Matches(otp *OTP) (bool, error) {
	valid, err := totp.ValidateCustom(otp.OTP.Code, otp.OTP.SecretKey, time.Now(), totp.ValidateOpts{
		Period: 60 * 15,
		Skew:   1,
		Digits: 6,
	})

	if err != nil {
		return false, err
	}

	return valid, nil
}

func ValidateOTPCode(v *validator.Validator, code string) {
	v.Check(len(code) == 6, "otp", "length must be 6")
}

type OTPModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m OTPModel) New(accountName string, ttl time.Duration, userID int64) (*OTP, error) {
	otp, err := generateOTP(accountName, ttl, userID)
	if err != nil {
		return nil, err
	}

	secretKey, err := security.EncryptionWithHex(otp.OTP.SecretKey)

	if err != nil {
		return nil, err
	}

	otp.OTP.SecretKey = secretKey

	err = m.Insert(otp)

	return otp, err
}

func (m OTPModel) Insert(otp *OTP) error {
	query := `
		INSERT INTO otps (user_pid, created_at, secret_key, expiry)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_pid)
		DO UPDATE
		SET created_at = $2, secret_key = $3, expiry = $4`

	args := []interface{}{otp.ID, otp.CreatedAt, otp.OTP.SecretKey, otp.Expiry}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, args...)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()

	if err != nil {
		return err
	}

	if rows != 1 {
		return fmt.Errorf("expected 1 row, but affected %d rows", rows)
	}

	go CacheSet(m.Redis, m.generateCacheKey(otp.ID), otp, 15*time.Minute)

	return nil
}

func (m OTPModel) Delete(userID int64) error {
	go CacheDel(m.Redis, m.generateCacheKey(userID))

	query := `
		DELETE FROM otps WHERE user_pid = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, userID)
	return err
}

func (m OTPModel) Get(userID int64) (*OTP, error) {
	dataJSON, err := CacheGet(m.Redis, m.generateCacheKey(userID))

	if nil == err {
		var otp OTP
		err = json.Unmarshal([]byte(dataJSON), &otp)
		if nil == err {
			secretKey, err := security.DecryptionWithHex(otp.OTP.SecretKey)
			if nil == err {
				otp.OTP.SecretKey = secretKey
				return &otp, nil
			}
		}
	}

	query := `
		SELECT user_pid, created_at, secret_key, expiry
		FROM otps WHERE user_pid = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var otp OTP

	err = m.DB.QueryRowContext(ctx, query, userID).Scan(
		&otp.ID,
		&otp.CreatedAt,
		&otp.OTP.SecretKey,
		&otp.Expiry,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	secretKey, err := security.DecryptionWithHex(otp.OTP.SecretKey)
	if err != nil {
		return nil, err
	}

	otp.OTP.SecretKey = secretKey
	return &otp, nil
}

func (m OTPModel) generateCacheKey(userID int64) string {
	return fmt.Sprintf("otp:%d", userID)
}
