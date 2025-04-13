package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

type VoteType int

const (
	Upvote   = 1
	Downvote = -1
	None     = 0
)

const PostVoteQueueKey = "post_vote:queue"

func (v VoteType) String() string {
	switch v {
	case Upvote:
		return "upvote"
	case Downvote:
		return "downvote"
	case None:
		return "none"
	default:
		return "unknown"
	}
}

type PostVote struct {
	PostID   int64    `json:"post_id" db:"post_id"`
	UserID   int64    `json:"user_id" db:"user_id"`
	VoteType VoteType `json:"vote_type" db:"vote_type"`
}

type PostVoteModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m PostVoteModel) Get(postVotes []*PostVote) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT vote_type
		FROM post_votes WHERE post_id = $1 AND user_id = $2`

	stmt, err := m.DB.Prepare(query)
	if err != nil {
		return err
	}

	for _, postVote := range postVotes {
		args := []any{postVote.PostID, postVote.UserID}
		err := stmt.QueryRowContext(ctx, args...).Scan(
			&postVote.VoteType,
		)
		if err != nil {
			switch {
			case errors.Is(err, sql.ErrNoRows):
				postVote.VoteType = 0
			default:
				return err
			}
		}
	}

	return nil
}

func ValidateVote(v *validator.Validator, vote VoteType) {
	v.Check(vote == 0 || vote == -1 || vote == 1, "vote", "should either be 1(upvote), 0, -1(downvote)")
}

func (m *PostVoteModel) Insert(tx *sql.Tx, postVote *PostVote) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if postVote.VoteType == 0 {
		return m.Delete(tx, postVote.PostID, postVote.UserID)
	}

	query := `
		INSERT INTO post_votes(post_id, user_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, post_id) DO UPDATE
		SET vote_type = $3
	`

	args := []any{postVote.PostID, postVote.UserID, postVote.VoteType}

	_, err := tx.ExecContext(ctx, query, args...)
	return err
}

func (m PostVoteModel) BatchInsertTx(tx *sql.Tx, postVotes *[]*PostVote) (failedPostVotes []*PostVote, err error) {
	insertQuery := `
		INSERT INTO post_votes(post_id, user_id, vote_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, post_id) DO UPDATE
		SET vote_type = $3
	`
	deleteQuery := `
		DELETE FROM post_votes
		WHERE post_id = $1 AND user_id = $2
	`
	insertStmt, err := tx.Prepare(insertQuery)
	deleteStmt, err := tx.Prepare(deleteQuery)
	if err != nil {
		return nil, err
	}
	defer insertStmt.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	successIdx := 0
	for _, postVote := range *postVotes {

		var result sql.Result
		var err error
		if postVote.VoteType == 0 {
			args := []any{postVote.PostID, postVote.UserID}
			result, err = deleteStmt.ExecContext(ctx, args...)
			logger.PrintInfo("delete", nil)
		} else {
			args := []any{postVote.PostID, postVote.UserID, postVote.VoteType}
			result, err = insertStmt.ExecContext(ctx, args...)
			logger.PrintInfo("insert", nil)
		}
		if err != nil {
			failedPostVotes = append(failedPostVotes, postVote)
		}
		rows, err := result.RowsAffected()
		if err != nil {
			logger.PrintError(err, nil)
		}
		if rows == 0 {
			failedPostVotes = append(failedPostVotes, postVote)
		}
		successIdx++
	}
	*postVotes = (*postVotes)[:successIdx]
	return failedPostVotes, nil
}

func (m *PostVoteModel) GetAll(posts []*Post, userID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT vote_type
		FROM post_votes WHERE post_id = $1 AND user_id = $2
	`

	stmt, err := m.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, post := range posts {
		if err := stmt.QueryRowContext(ctx, post.ID, userID).Scan(
			&post.VoteType,
		); err != nil {
			switch {
			case errors.Is(err, sql.ErrNoRows):
				post.VoteType = None
			default:
				return err
			}
		}
	}

	return nil
}

func (m PostVoteModel) Delete(tx *sql.Tx, postID int64, userID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		DELETE FROM post_votes
		WHERE post_id = $1 AND user_id = $2
	`

	_, err := tx.ExecContext(ctx, query, postID, userID)
	return err
}

func (m PostVoteModel) generateCacheKey(postID int64, userID int64) string {
	return fmt.Sprintf("post:%d:user:%d", postID, userID)
}
