package data

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

var PostStatsCacheDuration = 5 * time.Minute

type PostStats struct {
	ID             int64      `json:"post_id" db:"post_pid"`
	UpvoteCount    int        `json:"upvote_count" db:"upvote_count"`
	DownvoteCount  int        `json:"downvote_count" db:"downvote_count"`
	CommentCount   int        `json:"comment_count" db:"comment_count"`
	Score          float64    `json:"score" db:"score"`
	LastActivityAt time.Time  `json:"last_activity_at" db:"last_activity_at"`
	LastCommentAt  *time.Time `json:"last_comment_at" db:"last_comment_at"`
}

type PostStatsModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m PostStatsModel) Get(postID int64) (*PostStats, error) {
	// postStatsJSON, err := CacheGet(m.Redis, m.generateCacheKey(postID))
	// if nil == err {
	// 	var postStats PostStats
	// 	err := json.Unmarshal([]byte(postStatsJSON), &postStats)
	// 	if nil == err {
	// 		return &postStats, nil
	// 	}
	// }

	query := `
		SELECT post_pid, upvote_count, downvote_count, comment_count, score, last_activity_at, last_comment_at
		FROM post_stats
		WHERE post_pid = $1
	`

	var postStats PostStats

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, postID).Scan(
		&postStats.ID,
		&postStats.UpvoteCount,
		&postStats.DownvoteCount,
		&postStats.CommentCount,
		&postStats.Score,
		&postStats.LastActivityAt,
		&postStats.LastCommentAt,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	// go func(postStats PostStats) {
	// 	CacheSet(m.Redis, m.generateCacheKey(postStats.ID), &postStats, postCacheDuration)
	// }(postStats)

	return &postStats, nil
}

func (m PostStatsModel) UpdateCommentCountTx(tx *sql.Tx, postID int64, delta int) error {
	query := `
		UPDATE post_stats
		SET comment_count = comment_count + $1
		WHERE post_pid = $2
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := tx.ExecContext(ctx, query, delta, postID)
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
	return err
}

func (m PostStatsModel) BatchUpdateCommentsTx(tx *sql.Tx, postCommentCounts map[int64]int) error {
	query := `
		UPDATE post_stats
		SET comment_count = comment_count + $1
		WHERE post_pid = $2
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for postID, counts := range postCommentCounts {
		args := []any{counts, postID}
		result, err := stmt.ExecContext(ctx, args...)
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
	}
	return nil
}

func (m PostStatsModel) UpdateVoteCount(tx *sql.Tx, postID int64, deltaUpvote, deltaDownvote int) error {
	query := `
		UPDATE post_stats
		SET upvote_count = upvote_count + $1,
			downvote_count = downvote_count + $2
		WHERE post_pid = $3
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := tx.ExecContext(ctx, query, deltaUpvote, deltaDownvote, postID)
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

func (m PostStatsModel) generateCacheKey(postID int64) string {
	return "post_stats:" + strconv.FormatInt(postID, 10)
}
