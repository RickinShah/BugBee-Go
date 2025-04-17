package worker

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/jsonlog"
	"github.com/go-redis/redis/v8"
)

type NSFWResponse struct {
	NSFW int    `json:"nsfw"`
	Err  string `json:"error", omitempty`
}

var logger = jsonlog.New(os.Stdout, jsonlog.LevelInfo)

func StartNSFWWorker(ctx context.Context, m data.Models, workerID int) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				logger.PrintInfo("[Worker stopping]", map[string]string{
					"workerID:": strconv.Itoa(workerID),
				})
				return
			default:
				var file data.File
				result := m.Posts.Redis.RPop(ctx, data.NSFWQueue)
				if err := result.Err(); err != nil {
					if err == redis.Nil {
						time.Sleep(5 * time.Second)
						continue
					}
				}

				fileStr := result.Val()

				err := json.Unmarshal([]byte(fileStr), &file)
				if err != nil {
					logger.PrintError(err, map[string]string{
						"workerID": strconv.Itoa(workerID),
						"fileID":   strconv.FormatInt(file.ID, 10),
					})
				}

				if err = processNSFW(ctx, file, m); err != nil {
					continue
				}

			}
		}
	}()
}

func StartCommentWorker(ctx context.Context, m data.Models, workerID int) {
	go func() {
		insertQueue := fmt.Sprintf("comment:insert:queue:%d", workerID)
		deleteQueue := fmt.Sprintf("comment:delete:queue:%d", workerID)
		updateQueue := fmt.Sprintf("comment:update:queue:%d", workerID)

		const batchSize = 100
		workerTicker := time.NewTicker(5 * time.Second)
		defer workerTicker.Stop()
		batchTicker := time.NewTicker(1 * time.Second)
		defer batchTicker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-workerTicker.C:
				if err := insertComments(ctx, insertQueue, m); nil == err {
					time.Sleep(100 * time.Millisecond)
				}
				if err := deleteComments(ctx, deleteQueue, m); nil == err {
					time.Sleep(100 * time.Millisecond)
				}
				if err := updateComments(ctx, deleteQueue, m); nil == err {
					time.Sleep(100 * time.Millisecond)
				}
			case <-batchTicker.C:
				for range batchSize {
					err := m.Comments.Redis.RPopLPush(ctx, data.CommentInsertQueueKey, insertQueue).Err()
					if err != nil {
						switch {
						case err == redis.Nil:
							break
						default:
							logger.PrintError(err, nil)
							break
						}
					}
				}
				for range batchSize {
					err := m.Comments.Redis.RPopLPush(ctx, data.CommentDeleteQueueKey, deleteQueue).Err()
					if err != nil {
						switch {
						case err == redis.Nil:
							break
						default:
							logger.PrintError(err, nil)
							break
						}
					}
				}
				for range batchSize {
					err := m.Comments.Redis.RPopLPush(ctx, data.CommentUpdateQueueKey, updateQueue).Err()
					if err != nil {
						switch {
						case err == redis.Nil:
							break
						default:
							logger.PrintError(err, nil)
							break
						}
					}
				}
			default:
				time.Sleep(100 * time.Millisecond)
			}
		}
	}()
}

func insertComments(ctx context.Context, key string, m data.Models) error {
	comments, err := m.Comments.Redis.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if len(comments) == 0 {
		return nil
	}

	logger.PrintInfo("processing comments", map[string]string{"count": strconv.Itoa(len(comments))})

	batch := make([]*data.Comment, 0, len(comments))
	for _, c := range comments {
		var comment data.Comment
		err := json.Unmarshal([]byte(c), &comment)
		if err != nil {
			return err
		}
		batch = append(batch, &comment)
	}

	tx, err := m.Comments.DB.Begin()
	if err != nil {
		logger.PrintError(err, nil)
		return err
	}
	defer tx.Rollback()

	if failedComments, err := m.Comments.BatchInsertTx(tx, &batch); err != nil {
		logger.PrintError(err, map[string]string{"failed comments:": strconv.Itoa(len(failedComments))})
	}

	postCommentsCount := make(map[int64]int)
	if err := m.CommentStats.BatchInsertTx(tx, batch); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	for _, comment := range batch {
		postCommentsCount[comment.PostID]++
	}

	if err := m.PostStats.BatchUpdateCommentsTx(tx, postCommentsCount); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if err = m.Comments.Redis.Del(ctx, key).Err(); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if err := tx.Commit(); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	logger.PrintInfo("processed comments", map[string]string{"count": strconv.Itoa(len(batch)), "worker": key})
	return nil
}

func deleteComments(ctx context.Context, key string, m data.Models) error {
	comments, err := m.Comments.Redis.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		return err
	}
	if len(comments) == 0 {
		return nil
	}

	logger.PrintInfo("processing delete comments", map[string]string{"count": strconv.Itoa(len(comments))})

	batch := make([]data.Comment, 0, len(comments))
	for _, c := range comments {
		var comment data.Comment
		err := json.Unmarshal([]byte(c), &comment)
		if err != nil {
			return err
		}
		batch = append(batch, comment)
	}

	failedIDs, err := m.Comments.BatchDelete(batch)
	if err != nil {
		logger.PrintError(errors.New("failed some comments"), map[string]string{"failed comments:": strconv.Itoa(len(failedIDs))})
	}
	logger.PrintInfo("processed delete comments", map[string]string{"count": strconv.Itoa(len(batch) - len(failedIDs)), "worker": key})

	if err = m.Comments.Redis.Del(ctx, key).Err(); err != nil {
		logger.PrintError(err, nil)
		return err
	}
	return nil
}

func updateComments(ctx context.Context, key string, m data.Models) error {
	comments, err := m.Comments.Redis.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if len(comments) == 0 {
		return nil
	}

	logger.PrintInfo("processing update comments", map[string]string{"count": strconv.Itoa(len(comments))})

	batch := make([]*data.Comment, 0, len(comments))
	for _, c := range comments {
		var comment data.Comment
		err := json.Unmarshal([]byte(c), &comment)
		if err != nil {
			return err
		}
		batch = append(batch, &comment)
	}

	failedIDs, err := m.Comments.BatchUpdate(&batch)
	if err != nil {
		logger.PrintError(errors.New("failed update comments"), map[string]string{"failed comments:": strconv.Itoa(len(failedIDs))})
	}
	logger.PrintInfo("processed update comments", map[string]string{"count": strconv.Itoa(len(batch) - len(failedIDs)), "worker": key})

	if err = m.Comments.Redis.Del(ctx, key).Err(); err != nil {
		logger.PrintError(err, nil)
		return err
	}
	return nil
}

func processNSFW(ctx context.Context, file data.File, m data.Models) error {
	serverProtocol := flag.Lookup("protocol").Value.String()
	serverHost := flag.Lookup("host").Value.String()
	// serverPort, err := strconv.ParseInt(flag.Lookup("port").Value.String(), 10, 64)
	// if err != nil {
	// 	logger.PrintError(err, nil)
	// 	return err
	// }

	imageURL := fmt.Sprintf("%s://%s:%d/media%s", serverProtocol, serverHost, 443, file.Path)
	apiURL := "http://localhost:8001/api/posts/check-nsfw?image_url=" + imageURL

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		logger.PrintError(errors.New("Error requesting nsfw-detector: "+err.Error()), map[string]string{
			"fileID": strconv.FormatInt(file.ID, 10),
		})
		return err
	}

	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		logger.PrintError(errors.New("Error making response nsfw-detector: "+err.Error()), map[string]string{
			"fileID": strconv.FormatInt(file.ID, 10),
		})
		return err
	}
	defer resp.Body.Close()

	var result NSFWResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		logger.PrintError(errors.New("Error decoding response nsfw-detector: "+err.Error()), map[string]string{
			"fileID": strconv.FormatInt(file.ID, 10),
		})
		return err
	}

	if result.Err != "" {
		logger.PrintError(errors.New("NSFW detector returned error: "+result.Err), map[string]string{
			"fileID": strconv.FormatInt(file.ID, 10),
		})
		return errors.New(result.Err)
	}

	if result.NSFW == 1 {
		file.IsNSFW = true
		if err := m.Files.UpdateNSFW(file); err != nil {
			logger.PrintError(errors.New("Error decoding response nsfw-detector: "+err.Error()), map[string]string{
				"fileID": strconv.FormatInt(file.ID, 10),
			})
			return err
		}
	}

	return nil
}
