package data

import (
	"database/sql"
	"errors"

	"github.com/go-redis/redis/v8"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
)

type Models struct {
	Posts  PostModel
	Users  UserModel
	Tokens TokenModel
	OTPs   OTPModel
	// Comments     CommentModel
	PendingUsers PendingUserModel
}

func NewModels(db *sql.DB, redis *redis.Client) Models {
	return Models{
		Posts:  PostModel{DB: db, Redis: redis},
		Users:  UserModel{DB: db, Redis: redis},
		Tokens: TokenModel{DB: db, Redis: redis},
		OTPs:   OTPModel{DB: db, Redis: redis},
		// Comments:     CommentModel{DB: db, Redis: redis},
		PendingUsers: PendingUserModel{DB: db, Redis: redis},
	}
}
