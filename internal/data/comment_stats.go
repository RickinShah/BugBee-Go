package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/go-redis/redis/v8"
)

type CommentStats struct {
	CommentID     int64      `json:"comment_id,string" db:"comment_pid"`
	ReplyCount    int        `json:"reply_count" db:"reply_count"`
	UpvoteCount   int        `json:"upvote_count" db:"upvote_count"`
	Score         float64    `json:"score" db:"score"`
	DownvoteCount int        `json:"downvote_count" db:"downvote_count"`
	LastReplyAt   *time.Time `json:"last_reply_at" db:"last_reply_at"`
}

type CommentStatsModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommentStatsModel) InsertTx(tx *sql.Tx, id int64) error {
	query := `INSERT INTO comment_stats(comment_pid, last_reply_at) VALUES ($1, NULL)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := tx.ExecContext(ctx, query, id)
	return err
}

func (m CommentStatsModel) BatchInsertTx(tx *sql.Tx, comments []*Comment) error {
	query := `
		INSERT INTO comment_stats(comment_pid) VALUES ($1)
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, comment := range comments {
		if _, err = stmt.ExecContext(ctx, comment.ID); err != nil {
			return err
		}
	}
	return nil
}

func (m CommentStatsModel) UpdateVoteCount(tx *sql.Tx, commentID int64, deltaUpvote, deltaDownvote int) error {
	query := `
		UPDATE comment_stats
		SET upvote_count = upvote_count + $1,
			downvote_count = downvote_count + $2
		WHERE comment_pid = $3
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := tx.ExecContext(ctx, query, deltaUpvote, deltaDownvote, commentID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrRecordNotFound
	}
	return nil
}
