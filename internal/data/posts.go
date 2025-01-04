package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-redis/redis/v8"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
)

type Post struct {
	ID        int64     `json:"post_pid,string" db:"post_pid"`
	CreatedAt time.Time `json:"-" db:"created_at"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Upvotes   int32     `json:"upvotes"`
	Downvotes int32     `json:"downvotes"`
	PostType  string    `json:"post_type" db:"post_type"`
	Comments  int32     `json:"comments"`
	Version   int32     `json:"-"`
	all       bool
}

func (p *Post) MarshalJSON() ([]byte, error) {
	post := make(map[string]interface{}, 9)
	post["post_pid"] = p.ID
	post["title"] = p.Title
	post["content"] = p.Content
	post["upvotes"] = p.Upvotes
	post["downvotes"] = p.Downvotes
	post["post_type"] = p.PostType
	post["comments"] = p.Comments
	if p.all {
		post["created_at"] = p.CreatedAt
		post["version"] = p.Version
	}
	return json.Marshal(post)
}

func ValidatePost(v *validator.Validator, post *Post) {
	v.Check(post.Title != "", "title", "must be provided")
	v.Check(len(post.Title) <= 50, "title", "must not be more than 50 characters")

	v.Check(post.Content != "", "content", "must be provided")
	v.Check(len(post.Content) <= 500, "content", "must not be more than 500 characters")

	v.Check(post.PostType != "", "post_type", "must be provided")
}

type PostModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m PostModel) Insert(post *Post) error {
	query := `
		INSERT INTO posts (title, content, post_type)
		VALUES ($1, $2, $3)
		RETURNING post_pid, created_at, version;`

	args := []interface{}{post.Title, post.Content, post.PostType}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&post.ID, &post.CreatedAt, &post.Version)

	if err != nil {
		return err
	}

	return nil
}

func (m PostModel) Get(id int64) (*Post, error) {
	if id < 1 {
		return nil, ErrRecordNotFound
	}

	query := `
		SELECT post_pid, created_at, title, content, upvotes, downvotes, comments, post_type, version
		FROM posts
		WHERE post_pid = $1`

	var post Post

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&post.ID,
		&post.CreatedAt,
		&post.Title,
		&post.Content,
		&post.Upvotes,
		&post.Downvotes,
		&post.Comments,
		&post.PostType,
		&post.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}

	}

	return &post, nil
}

func (m PostModel) Update(post *Post) error {
	query := `
		UPDATE posts
		SET title = $1, content = $2, upvotes = $3, downvotes = $4, comments = $5, post_type = $6, version = version + 1
		WHERE post_pid = $7 AND version = $8
		RETURNING version`

	args := []interface{}{
		post.Title,
		post.Content,
		post.Upvotes,
		post.Downvotes,
		post.Comments,
		post.PostType,
		post.ID,
		post.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&post.Version)

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

func (m PostModel) Delete(id int64) error {
	query := `
		DELETE FROM posts WHERE post_pid = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, id)
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

func (m PostModel) generateCacheKey(postID int64) string {
	return fmt.Sprintf("post:%d", postID)
}
