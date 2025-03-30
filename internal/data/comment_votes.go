package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

type CommentVote struct {
	CommentID int64    `json:"comment_id" db:"comment_id"`
	UserID    int64    `json:"user_id" db:"user_id"`
	VoteType  VoteType `json:"vote_type" db:"vote_type"`
}

type CommentVoteModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m *CommentVoteModel) Get(tx *sql.Tx, commentID int64, userID int64) (*CommentVote, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var commentVote CommentVote

	query := `
		SELECT comment_id, user_id, vote_type
		FROM comment_votes WHERE comment_id = $1 AND user_id = $2`

	err := tx.QueryRowContext(ctx, query, commentID, userID).Scan(
		&commentVote.CommentID,
		&commentVote.UserID,
		&commentVote.VoteType,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &commentVote, nil
}

func (m *CommentVoteModel) Insert(tx *sql.Tx, commentVote *CommentVote) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if commentVote.VoteType == 0 {
		return m.Delete(tx, commentVote.CommentID, commentVote.UserID)
	}

	query := `
		INSERT INTO comment_votes(comment_id, user_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (comment_id, user_id) DO UPDATE
		SET vote_type = $3
	`

	args := []any{commentVote.CommentID, commentVote.UserID, commentVote.VoteType}

	result, err := tx.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrEditConflict
	}
	return nil
}

func (m *CommentVoteModel) Delete(tx *sql.Tx, commentID int64, userID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		DELETE FROM comment_votes
		WHERE comment_id = $1 AND user_id = $2
	`
	result, err := tx.ExecContext(ctx, query, commentID, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrEditConflict
	}

	return nil
}
