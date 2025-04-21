package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
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
	VoteType  VoteType   `json:"vote_type"`
	all       bool
}

func (p *Post) MarshalJSON() ([]byte, error) {
	post := make(map[string]any, 9)
	post["post_id"] = strconv.FormatInt(p.ID, 10)
	post["content"] = p.Content
	post["has_files"] = p.HasFiles
	if p.User != nil {
		if p.User.marshalType == 0 {
			p.User.SetMarshalType(3)
		}
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
	post["vote_type"] = p.VoteType
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

	go m.AddPosts(post)
	return err
}

func (m PostModel) Get(id int64) (*Post, error) {
	cacheKey := m.generateCacheKey(id)
	cachedPost, err := m.GetSinglePostCache(cacheKey)
	if nil == err && cachedPost != nil {
		return cachedPost, nil
	}

	query := `
		SELECT u.username, u.name, u.profile_path, p.post_pid, p.created_at, p.content, p.has_files, p.version
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
		&post.User.Name,
		&post.User.ProfilePath,
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

	go m.CacheSinglePost(&post)

	return &post, nil
}

func (m PostModel) GetByUserID(userID int64) ([]*Post, error) {
	cachedUserPosts, err := m.GetPostsByUserID(userID)
	if err == nil && cachedUserPosts != nil {
		return cachedUserPosts, nil
	}
	query := `
		SELECT post_pid, user_id, created_at, content, has_files, version
		FROM posts
		WHERE user_id = $1
		ORDER BY post_pid DESC
	`
	var posts []*Post

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{userID}

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
			&tempPost.ID,
			&tempPost.User.ID,
			&tempPost.CreatedAt,
			&tempPost.Content,
			&tempPost.HasFiles,
			&tempPost.Version,
		); err != nil {
			return nil, err
		}
		go m.CachePostByUserID(&tempPost)
		posts = append(posts, &tempPost)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

func (m PostModel) GetAll(filters Filters) ([]*Post, error) {
	var posts []*Post

	posts, err := m.GetFeedPosts(filters)
	if err == nil && posts != nil {
		return posts, nil
	}

	query := `
		SELECT u.username, u.name, u.profile_path, p.post_pid, p.created_at, p.content, p.has_files, p.version
		FROM posts p
		LEFT JOIN users u ON p.user_id = u.user_pid
		WHERE post_pid < $1
		ORDER BY p.post_pid DESC
		LIMIT $2
	`

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
		go m.CachePosts(&tempPost)
		posts = append(posts, &tempPost)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

func (m PostModel) GetAllByUserID(userID int64, filters Filters) ([]*Post, error) {
	cachedUserPosts, err := m.GetPostsByUserID(userID)
	if err == nil && cachedUserPosts != nil {
		return cachedUserPosts, nil
	}

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

	go m.CacheDelete(post.ID, post.User.ID)

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

	go m.CacheDelete(postID, userID)

	return nil
}

func (m PostModel) GetFeedPosts(filters Filters) ([]*Post, error) {
	var posts []*Post

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	results, err := m.Redis.ZRevRangeByScore(ctx, "posts:feed", &redis.ZRangeBy{
		Max:    fmt.Sprintf("(%d", filters.LastID),
		Min:    "-inf",
		Offset: 0,
		Count:  int64(filters.PageSize),
	}).Result()
	if err != nil {
		return nil, err
	}

	posts, err = m.postsGetPipeline(ctx, results)
	if err != nil {
		logger.PrintError(err, map[string]string{"post": "pipelining error redis"})
		return nil, err
	}

	return posts, nil
}

func (m PostModel) AddPosts(post *Post) {
	m.CachePosts(post)
	m.CachePostByUserID(post)
	m.CacheSinglePost(post)
}

func (m PostModel) CachePosts(post *Post) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	score := float64(post.ID)
	post.SetIncludeAll(true)
	cacheKey := m.generateCacheKey(post.ID)

	err := m.Redis.ZAdd(ctx, "posts:feed", &redis.Z{Score: score, Member: cacheKey}).Err()
	if err != nil {
		logger.PrintError(err, map[string]string{"Redis": "Can't zadd post in cache"})
	}
}

func (m PostModel) CachePostByUserID(post *Post) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	score := float64(post.ID)
	userIDStr := strconv.FormatInt(post.User.ID, 10)
	post.SetIncludeAll(true)
	cacheKey := m.generateCacheKey(post.ID)

	err := m.Redis.ZAdd(ctx, "user:"+userIDStr+":posts", &redis.Z{Score: score, Member: cacheKey}).Err()
	if err != nil {
		logger.PrintError(err, map[string]string{"Redis": "Can't insert post in cache"})
	}
}

func (m PostModel) GetPostsByUserID(userID int64) ([]*Post, error) {
	var posts []*Post

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	userIDStr := strconv.FormatInt(userID, 10)

	results, err := m.Redis.ZRevRangeByScore(ctx, "user:"+userIDStr+":posts", &redis.ZRangeBy{
		Max: strconv.FormatInt(math.MaxInt64, 10),
		Min: "-inf",
	}).Result()
	if err != nil {
		return nil, err
	}

	posts, err = m.postsGetPipeline(ctx, results)

	if err != nil {
		logger.PrintError(err, map[string]string{"post": "pipelining error redis"})
		return nil, err
	}

	return posts, nil
}

func (m PostModel) CacheDelete(postID int64, userID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	score := strconv.FormatInt(postID, 10)
	userIDStr := strconv.FormatInt(userID, 10)

	err := m.Redis.ZRemRangeByScore(ctx, "posts:feed", score, score).Err()
	if err != nil {
		return err
	}
	err = m.Redis.ZRemRangeByScore(ctx, "user:"+userIDStr+":posts", score, score).Err()
	if err != nil {
		return err
	}
	cacheKey := m.generateCacheKey(postID)
	err = m.Redis.Del(ctx, cacheKey).Err()
	if err != nil {
		return err
	}
	return nil
}

func (m PostModel) CacheSinglePost(post *Post) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	cacheKey := m.generateCacheKey(post.ID)

	post.SetIncludeAll(true)
	postJSON, err := json.Marshal(post)
	if err != nil {
		logger.PrintError(err, map[string]string{"post": "can't convert to json"})
	}

	m.Redis.Set(ctx, cacheKey, postJSON, postCacheDuration)
}

func (m PostModel) GetSinglePostCache(cacheKey string) (*Post, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	var post Post

	postJSON, err := m.Redis.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(postJSON), &post); err != nil {
		logger.PrintError(err, map[string]string{"post": "can't unmarshal"})
	}
	return &post, nil
}

func (m PostModel) postsGetPipeline(ctx context.Context, results []string) ([]*Post, error) {
	pipe := m.Redis.Pipeline()
	cmds := make([]*redis.StringCmd, len(results))
	var posts []*Post
	var missingPostIDs []int64

	for i, key := range results {
		cmds[i] = pipe.Get(ctx, key)
	}

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return nil, err
	}

	for i, cmd := range cmds {
		var post Post
		postJSON, err := cmd.Result()
		if err != nil {
			postID, err := m.extractPostID(results[i])
			if err != nil {
				return nil, err
			}
			missingPostIDs = append(missingPostIDs, postID)
			continue
		}
		if err = json.Unmarshal([]byte(postJSON), &post); err != nil {
			return nil, err
		}
		posts = append(posts, &post)
	}

	if len(missingPostIDs) > 0 {
		go m.cachePost(missingPostIDs)
		return nil, errors.New("not cached")
	}
	return posts, nil
}

func (m PostModel) cachePost(postIDs []int64) {
	for _, postID := range postIDs {
		_, err := m.Get(postID)
		if err != nil {
			logger.PrintError(err, map[string]string{"post": "caching error"})
		}
	}
}

func (m PostModel) extractPostID(key string) (int64, error) {
	parts := strings.Split(key, ":")
	if len(parts) != 2 {
		return 0, errors.New("invalid cache key")
	}

	return strconv.ParseInt(parts[1], 10, 64)
}

func (m PostModel) generateCacheKey(postID int64) string {
	return fmt.Sprintf("post:%d", postID)
}
