package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"image/jpeg"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

var AllowedFileTypes = map[string]bool{
	"image/jpeg":       true,
	"image/png":        true,
	"image/webp":       true,
	"image/gif":        true,
	"video/mp4":        true,
	"video/webm":       true,
	"video/quicktime":  true,
	"video/x-matroska": true,
	"video/x-msvideo":  true,
	"audio/aac":        true,
	"audio/wav":        true,
	"audio/ogg":        true,
	"audio/mpeg":       true,
	"audio/x-wav":      true,
	"audio/x-m4a":      true,
	// "application/pdf": true,
}

const NSFWQueue = "nsfw_detector:queue"

var MIMEToExtension = map[string]string{
	"image/jpeg":       ".jpg",
	"image/png":        ".png",
	"image/webp":       ".webp",
	"image/gif":        ".gif",
	"video/mp4":        ".mp4",
	"video/webm":       ".webm",
	"video/quicktime":  ".mov",
	"video/x-matroska": ".mkv",
	"video/x-msvideo":  ".avi",
	"audio/aac":        ".aac",
	"audio/wav":        ".wav",
	"audio/ogg":        ".ogg",
	"audio/mpeg":       ".mp3",
	"audio/x-wav":      ".wav",
	"audio/x-m4a":      ".m4a",
}

const (
	fileCacheDuration = 30 * time.Minute
)

type File struct {
	ID        int64     `json:"file_id,string" db:"file_pid"`
	PostID    int64     `json:"post_id,string" db:"post_id"`
	Path      string    `json:"path" db:"path"`
	Type      string    `json:"type" db:"type"`
	Size      int64     `json:"size" db:"size"`
	IsNSFW    bool      `json:"is_nsfw" db:"is_nsfw"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	all       bool
}

func (f *File) MarshalJSON() ([]byte, error) {
	file := make(map[string]any, 7)
	file["file_id"] = strconv.FormatInt(f.ID, 10)
	file["path"] = f.Path
	file["is_nsfw"] = f.IsNSFW
	file["type"] = f.Type
	file["post_id"] = strconv.FormatInt(f.PostID, 10)
	file["created_at"] = f.CreatedAt
	if f.all {
		file["size"] = f.Size
	}
	return json.Marshal(file)
}

func (f *File) SetIncludeAll(include bool) {
	f.all = true
}

func ValidateFile(v *validator.Validator, fileHeader multipart.FileHeader, fileType string) {
	v.Check(AllowedFileTypes[fileType], "file type", "invalid")
	v.Check(fileHeader.Size < (100<<20), "file size", "should be less than 100 MB")
}

func ValidateProfilePic(v *validator.Validator, file multipart.File) {
	img, err := jpeg.Decode(file)
	if err != nil {
		v.AddError("profile picture", "must be in .jpg/.jpeg")
	}

	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	if width != height {
		v.AddError("profile picture", "must be in 1:1 aspect ratio")
	}
	file.Seek(0, io.SeekStart)
}

func SaveFile(file multipart.File, path string) error {
	dst, err := os.Create(path)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	return err
}

func DeleteFile(bucket string, fileName string) error {
	supabaseURL := flag.Lookup("supabase-url").Value.String()
	apiKey := flag.Lookup("supabase-api-key").Value.String()
	url := fmt.Sprintf("%s/storage/v1/object/%s%s", supabaseURL, bucket, fileName)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		log.Print(err)
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	log.Print(resp.StatusCode)
	if resp.StatusCode != http.StatusOK || resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return errors.New(string(body))
	}

	return nil
}

func UploadFile(bucket string, file multipart.File, fileName string, contentType string) error {
	supabaseURL := flag.Lookup("supabase-url").Value.String()
	apiKey := flag.Lookup("supabase-api-key").Value.String()

	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", supabaseURL, bucket, fileName)
	req, err := http.NewRequest("POST", url, file)
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return errors.New(string(body))
	}

	return nil
}

func GetFileContentType(file multipart.File) (string, error) {
	buffer := make([]byte, 512)
	_, err := file.Read(buffer)
	if err != nil {
		return "", err
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}

	return http.DetectContentType(buffer), nil
}

func GetExtFromMIME(mimeType string) string {
	return MIMEToExtension[mimeType]
}

type FileModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func splitFilenameIntoDirs(fileID string, numParts int, partLength int) string {
	var parts []string
	for i := 0; i < numParts*partLength && i < len(fileID); i += partLength {
		parts = append(parts, fileID[i:i+partLength])
	}
	return strings.Join(parts, "/")
}

func GetFilePath(basePath string, ID int64, extension string) (string, error) {
	fileIDStr := strconv.FormatInt(ID, 10)
	noOfParts := 4
	partLength := 2
	dirStructure := splitFilenameIntoDirs(fileIDStr, noOfParts, partLength)
	fullDirPath := filepath.Join(basePath, dirStructure)

	// err := os.MkdirAll(fullDirPath, os.ModePerm)
	// if err != nil {
	// 	return "", err
	// }
	return filepath.Join(fullDirPath, fileIDStr+extension), nil
}

func (m FileModel) GetSingle(postIDs []int64) ([]*File, error) {
	cachedFiles, err := m.GetSingleFileCache(postIDs)
	if err == nil && cachedFiles != nil {
		return cachedFiles, nil
	}
	query := `
		SELECT DISTINCT ON (post_id) file_pid, post_id, path, type, size, is_nsfw, created_at
		FROM files
		WHERE post_id = ANY($1)
		ORDER BY post_id DESC, file_pid ASC
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, toPostgresIntArray(postIDs))
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	var files []*File

	for rows.Next() {
		var file File

		err := rows.Scan(
			&file.ID,
			&file.PostID,
			&file.Path,
			&file.Type,
			&file.Size,
			&file.IsNSFW,
			&file.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		files = append(files, &file)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return files, nil
}

func (m FileModel) Get(postID int64) ([]*File, error) {
	filesJSON, err := CacheGet(m.Redis, m.generateCacheKey(postID))
	if nil == err {
		var files []*File
		err := json.Unmarshal([]byte(filesJSON), &files)
		if nil == err {
			return files, nil
		}
	}
	query := `
		SELECT file_pid, post_id, path, type, size, is_nsfw, created_at
		FROM files
		WHERE post_id = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, postID)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	var files []*File

	for rows.Next() {
		var file File

		err := rows.Scan(
			&file.ID,
			&file.PostID,
			&file.Path,
			&file.Type,
			&file.Size,
			&file.IsNSFW,
			&file.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		files = append(files, &file)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	go func(postID int64, files []*File) {
		for i := range files {
			files[i].SetIncludeAll(true)
		}

		CacheSet(m.Redis, m.generateCacheKey(postID), &files, fileCacheDuration)
	}(postID, files)
	return files, nil
}

func (m FileModel) Insert(tx *sql.Tx, file *File) error {
	query := `
		INSERT INTO files(post_id, path, type, size)
		VALUES ($1, $2, $3, $4)
		RETURNING file_pid, created_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{file.PostID, file.Path, file.Type, file.Size}

	return tx.QueryRowContext(ctx, query, args...).Scan(&file.ID, &file.CreatedAt)
}

func (m FileModel) UpdateNSFW(file File) error {
	query := `
	UPDATE files 
	SET is_nsfw = $1
	WHERE file_pid = $2
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{file.IsNSFW, file.ID}

	_, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrRecordNotFound
		default:
			return err
		}
	}

	cacheKey := m.generateCacheKey(file.PostID)

	m.Redis.Del(context.Background(), cacheKey)
	return nil
}

func (m FileModel) UpdatePath(tx *sql.Tx, file File) error {
	query := `
		UPDATE files
		SET path = $1
		WHERE file_pid = $2
		RETURNING path;
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{file.Path, file.ID}

	_, err := tx.ExecContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrRecordNotFound
		default:
			return err
		}
	}

	return nil
}

func (m FileModel) generateCacheKey(postID int64) string {
	return "posts:" + strconv.FormatInt(postID, 10) + ":files"
}

func (m FileModel) generateSingleFileCacheKey(postID int64) string {
	return "posts:" + strconv.FormatInt(postID, 10) + ":first_file"
}

func (m FileModel) GetSingleFileCache(postIDs []int64) ([]*File, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	var postFile []*File
	var missingPostFiles []int64
	cmds := make([]*redis.StringCmd, len(postIDs))

	pipe := m.Redis.Pipeline()

	for i, postID := range postIDs {
		key := m.generateCacheKey(postID)
		cmds[i] = pipe.Get(ctx, key)
	}

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return nil, err
	}

	for i, cmd := range cmds {
		var files []*File
		filesJSON, err := cmd.Result()
		if err != nil {
			missingPostFiles = append(missingPostFiles, postIDs[i])
			continue
		}
		if err = json.Unmarshal([]byte(filesJSON), &files); err != nil {
			return nil, err
		}
		postFile = append(postFile, files[0])
	}

	if len(missingPostFiles) > 0 {
		go m.cacheFiles(missingPostFiles)
		return nil, errors.New("missing files in cache")
	}
	return postFile, nil
}

func (m FileModel) cacheFiles(postIDs []int64) {
	for _, postID := range postIDs {
		_, err := m.Get(postID)

		if err != nil {
			logger.PrintError(err, map[string]string{"files": "caching error"})
		}
	}
}

func (m FileModel) GetFileCache(postID int64) ([]*File, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	cacheKey := m.generateCacheKey(postID)
	filesJSON, err := m.Redis.Get(ctx, cacheKey).Result()
	if err != nil {
		logger.PrintError(err, map[string]string{"files": "cache get error"})
		return nil, err
	}

	var files []*File

	if err := json.Unmarshal([]byte(filesJSON), &files); err != nil {
		logger.PrintError(err, map[string]string{"files": "unmarshal error"})
		return nil, err
	}

	return files, nil
}

func (m FileModel) extractPostID(key string) (string, error) {
	parts := strings.Split(key, ":")
	if len(parts) != 2 {
		return "", errors.New("invalid cache key")
	}

	return parts[1], nil
}

func toPostgresIntArray(ids []int64) string {
	str := make([]string, len(ids))
	for i, id := range ids {
		str[i] = strconv.FormatInt(id, 10)
	}
	return "{" + strings.Join(str, ",") + "}"
}
