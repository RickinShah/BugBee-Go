package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/RickinShah/BugBee/internal/validator"
)

const (
	postCacheDuration = 30 * time.Minute
)

type Post struct {
	ID        int64      `json:"post_id,string" db:"post_pid"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	Content   *string    `json:"content"`
	HasFiles  bool       `json:"has_files"`
	Version   int32      `json:"version"`
	UpdatedAt time.Time  `json:"updated-at" db:"updated_at"`
	DeletedAt time.Time  `json:"deleted-at" db:"deleted_at"`
	User      *User      `json:"user" db:"users"`
	Stats     *PostStats `json:"stats"`
	Files     []*File    `json:"files"`
	all       bool
}

func (p *Post) MarshalJSON() ([]byte, error) {
	post := make(map[string]any, 9)
	post["post_id"] = strconv.FormatInt(p.ID, 10)
	post["content"] = p.Content
	post["has_files"] = p.HasFiles
	if p.User != nil {
		p.User.SetMarshalType(3)
		post["user"] = p.User
	}
	if p.all {
		post["created_at"] = p.CreatedAt
		post["version"] = p.Version
	}
	if p.Files != nil {
		post["files"] = p.Files
	}
	if p.Stats != nil {
		post["stats"] = p.Stats
	}
	return json.Marshal(post)
}

func (p *Post) SetIncludeAll(include bool) {
	p.all = include
}

func ValidateContent(v *validator.Validator, content string) {
	v.Check(len(content) <= 500, "content", "must not be more than 500 characters")
}

type PostModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m PostModel) Insert(tx *sql.Tx, post *Post) error {
	query := `
		INSERT INTO posts (user_id, content, has_files)
		VALUES ($1, $2, $3)
		RETURNING post_pid, created_at, version;`

	args := []any{post.User.ID, post.Content, post.HasFiles}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := tx.QueryRowContext(ctx, query, args...).Scan(&post.ID, &post.CreatedAt, &post.Version)

	if err != nil {
		return err
	}

	query = `INSERT INTO post_stats(post_pid) VALUES ($1)`

	_, err = tx.ExecContext(ctx, query, post.ID)
	return err
}

func (m PostModel) Get(id int64) (*Post, error) {
	postJSON, err := CacheGet(m.Redis, m.generateCacheKey(id))
	if nil == err {
		var post Post
		err := json.Unmarshal([]byte(postJSON), &post)
		if nil == err {
			return &post, nil
		}
	}

	query := `
		SELECT u.username, p.post_pid, p.created_at, p.content, p.has_files, p.version
		FROM posts p
		LEFT JOIN users u ON p.user_id = u.user_pid
		WHERE post_pid = $1
	`

	post := Post{
		User: &User{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err = m.DB.QueryRowContext(ctx, query, id).Scan(
		&post.User.Username,
		&post.ID,
		&post.CreatedAt,
		&post.Content,
		&post.HasFiles,
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

	go func(post Post) {
		post.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(post.ID), &post, postCacheDuration)
	}(post)

	return &post, nil
}

func (m PostModel) GetAll(filters Filters) ([]*Post, error) {
	query := `
		SELECT u.username, u.name, u.profile_path, p.post_pid, p.created_at, p.content, p.has_files, p.version
		FROM posts p
		LEFT JOIN users u ON p.user_id = u.user_pid
		WHERE post_pid < $1
		ORDER BY p.post_pid DESC
		LIMIT $2
	`

	var posts []*Post

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{filters.LastID, filters.PageSize}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	for rows.Next() {
		tempPost := Post{
			User: &User{},
		}
		if err := rows.Scan(
			&tempPost.User.Username,
			&tempPost.User.Name,
			&tempPost.User.ProfilePath,
			&tempPost.ID,
			&tempPost.CreatedAt,
			&tempPost.Content,
			&tempPost.HasFiles,
			&tempPost.Version,
		); err != nil {
			return nil, err
		}
		posts = append(posts, &tempPost)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

func (m PostModel) GetAllByUserID(userID int64, filters Filters) ([]*Post, error) {
	query := `
		SELECT u.username, u.name, u.profile_path, p.post_pid, p.created_at, p.content, p.has_files, p.version
		FROM posts p
		LEFT JOIN users u ON p.user_id = u.user_pid
		WHERE post_pid < $1 AND user_id = $2
		ORDER BY p.post_pid DESC
		LIMIT $3
	`

	var posts []*Post

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{filters.LastID, userID, filters.PageSize}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	for rows.Next() {
		tempPost := Post{
			User: &User{},
		}
		if err := rows.Scan(
			&tempPost.User.Username,
			&tempPost.User.Name,
			&tempPost.User.ProfilePath,
			&tempPost.ID,
			&tempPost.CreatedAt,
			&tempPost.Content,
			&tempPost.HasFiles,
			&tempPost.Version,
		); err != nil {
			return nil, err
		}
		posts = append(posts, &tempPost)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

func (m PostModel) Update(post *Post) error {
	query := `
		UPDATE posts
		SET content = $1, updated_at = NOW(), version = version + 1
		WHERE post_pid = $2 AND version = $3
		RETURNING user_id, version`

	args := []any{
		post.Content,
		post.ID,
		post.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&post.User.ID, &post.Version)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}

	go func(post Post) {
		post.SetIncludeAll(true)
		CacheDel(m.Redis, m.generateCacheKey(post.ID))
	}(*post)

	return nil
}

func (m PostModel) Delete(postID, userID int64) error {
	query := `DELETE FROM posts WHERE post_pid = $1 AND user_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, postID, userID)
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

	go CacheDel(m.Redis, m.generateCacheKey(postID))

	return nil
}

func (m PostModel) generateCacheKey(postID int64) string {
	return fmt.Sprintf("post:%d", postID)
}
