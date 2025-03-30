package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

const commentCacheDuration = 30 * time.Minute
const CommentInsertQueueKey = "comment:insert:queue"
const CommentDeleteQueueKey = "comment:delete:queue"

type Comment struct {
	ID              int64        `json:"comment_id,string" db:"comment_pid"`
	PostID          int64        `json:"post_id,string" db:"post_id"`
	User            *User        `json:"user" db:"users"`
	ParentCommentID *int64       `json:"parent_comment_id,string" db:"parent_comment_id"`
	CreatedAt       time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at" db:"updated_at"`
	Content         string       `json:"content" db:"content"`
	Stats           CommentStats `json:"stats" db:"comment_stats"`
	Version         int64        `json:"version" db:"version"`
	all             bool
}

func (c *Comment) MarshalJSON() ([]byte, error) {
	comment := make(map[string]any, 9)
	comment["comment_id"] = strconv.FormatInt(c.ID, 10)
	comment["post_id"] = strconv.FormatInt(c.PostID, 10)
	if c.ParentCommentID != nil {
		comment["parent_id"] = strconv.FormatInt(*c.ParentCommentID, 10)
	}
	comment["created_at"] = c.CreatedAt
	comment["updated_at"] = c.UpdatedAt
	comment["content"] = c.Content
	comment["user"] = c.User
	if c.all {
		comment["comment_stats"] = c.Stats
	}

	return json.Marshal(comment)
}

func (c *Comment) SetIncludeAll(include bool) {
	c.all = include
}

func ValidateComment(v *validator.Validator, content string) {
	v.Check(len(content) > 1 && len(content) < 500, "comment", "should be between 1 and 500 characters")
}

type CommentModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommentModel) BatchInsertTx(tx *sql.Tx, comments *[]*Comment) (failedComments []*Comment, err error) {
	query := `
		INSERT INTO comments(post_id, parent_comment_id, user_id, content)
		VALUES ($1, $2, $3, $4)
		RETURNING comment_pid, created_at
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	successIdx := 0
	for _, comment := range *comments {
		args := []any{comment.PostID, comment.ParentCommentID, comment.User.ID, comment.Content}
		if err = stmt.QueryRowContext(ctx, args...).Scan(&comment.ID, &comment.CreatedAt); err != nil {
			failedComments = append(failedComments, comment)
			continue
		}
		(*comments)[successIdx] = comment
		successIdx++
	}
	*comments = (*comments)[:successIdx]
	return failedComments, nil
}

func (m CommentModel) UpdateTx(tx *sql.Tx, comment *Comment) error {
	query := `
		UPDATE comments SET content = $1, updated_at = now(), version = version + 1
		WHERE comment_pid = $2
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{comment.Content, comment.ID}
	err := tx.QueryRowContext(ctx, query, args...).Scan(&comment.Version)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}
	return nil
}

func (m CommentModel) GetAll(postID int64) ([]*Comment, error) {
	query := `
		SELECT u.username, u.name, u.profile_path, c.content
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.user_pid
		WHERE c.post_id = $1
		ORDER BY comment_pid DESC
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{postID}

	stmt, err := m.DB.PrepareContext(ctx, query)
	if err != nil {
		return nil, err
	}
	rows, err := stmt.Query(args...)

	var comments []*Comment
	for rows.Next() {
		comment := Comment{
			User: &User{},
		}
		if err := rows.Scan(&comment.User.Username, &comment.User.Name, &comment.User.ProfilePath, &comment.Content); err != nil {
			switch {
			case errors.Is(err, sql.ErrNoRows):
				return nil, ErrRecordNotFound
			default:
				return nil, err
			}
		}
		comment.User.SetMarshalType(3)
		comments = append(comments, &comment)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

func (m CommentModel) Delete(tx *sql.Tx, commentID, userID int64) error {
	query := `
		DELETE FROM comments
		WHERE comment_pid = $1 AND user_id = $2
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{commentID, userID}

	result, err := tx.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrRecordNotFound
	}

	return nil
}

func (m CommentModel) BatchDelete(comments []Comment) ([]int64, error) {
	query := `
		DELETE FROM comments
		WHERE comment_pid = $1 AND user_id = $2
	`

	var failedIDs []int64

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stmt, err := m.DB.PrepareContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	for _, comment := range comments {
		args := []any{comment.ID, comment.User.ID}

		result, err := stmt.ExecContext(ctx, args...)
		if err != nil {
			failedIDs = append(failedIDs, comment.ID)
		}
		rows, err := result.RowsAffected()
		if err != nil {
			logger.PrintError(err, nil)
		}
		if rows == 0 {
			failedIDs = append(failedIDs, comment.ID)
		}
	}

	if len(failedIDs) > 0 {
		return failedIDs, ErrRecordNotFound
	}

	return failedIDs, nil
}

func (m CommentModel) generateCacheKey(commentID int64) string {
	return fmt.Sprintf("comment:%d", commentID)
}
