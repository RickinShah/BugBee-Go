package tasks

// import (
// 	"context"
// 	"encoding/json"
// 	"errors"
// 	"fmt"
// 	"strconv"
// 	"time"

// 	"github.com/RickinShah/BugBee/internal/data"
// 	"github.com/hibiken/asynq"
// )

// type CommentTask struct {
// 	Type string
// 	Data data.Comment
// }

// var (
// 	commentBatchSize = 100
// 	commentTaskChan  = make(chan CommentTask, 200)
// )

// func ProcessCommentTask(models *data.Models) asynq.HandlerFunc {
// 	return func(ctx context.Context, t *asynq.Task) error {
// 		var comment data.Comment
// 		if err := json.Unmarshal(t.Payload(), &comment); err != nil {
// 			return err
// 		}
// 		select {
// 		case commentTaskChan <- CommentTask{t.Type(), comment}:
// 			// return asynq.SkipRetry
// 		default:
// 			logger.PrintError(errors.New("Comment queue is full"), nil)
// 			return errors.New("comment queue is full, retrying..")
// 		}
// 		return nil
// 	}
// }

// func StartCommentBatchProcessor(ctx context.Context, models *data.Models) {
// 	var insertBatch []data.Comment
// 	var updateBatch []data.Comment
// 	var deleteBatch []data.Comment
// 	ticker := time.NewTicker(2 * time.Second)
// 	defer ticker.Stop()

// 	for {
// 		select {
// 		case <-ctx.Done():
// 			logger.PrintInfo("Shutting down comment batch processor", nil)
// 			if len(insertBatch) > 0 {
// 				processCommentInsertBatch(models, &insertBatch)
// 			}
// 			if len(updateBatch) > 0 {
// 				processUpdateTask(models, &updateBatch)
// 			}
// 			if len(deleteBatch) > 0 {
// 				processDeleteTask(models, &deleteBatch)
// 			}
// 			return
// 		case <-ticker.C:
// 			if len(insertBatch) > 0 {
// 				processCommentInsertBatch(models, &insertBatch)
// 			}
// 			if len(updateBatch) > 0 {
// 				processUpdateTask(models, &updateBatch)
// 			}
// 			if len(deleteBatch) > 0 {
// 				processDeleteTask(models, &deleteBatch)
// 			}
// 		case commentTask := <-commentTaskChan:
// 			switch {
// 			case commentTask.Type == TypeCommentInsert:
// 				insertBatch = append(insertBatch, commentTask.Data)
// 			case commentTask.Type == TypeCommentUpdate:
// 				updateBatch = append(updateBatch, commentTask.Data)
// 			case commentTask.Type == TypeCommentDelete:
// 				deleteBatch = append(deleteBatch, commentTask.Data)
// 			}

// 			if len(insertBatch) >= commentBatchSize {
// 				processCommentInsertBatch(models, &insertBatch)
// 			}
// 			if len(updateBatch) >= commentBatchSize {
// 				processUpdateTask(models, &updateBatch)
// 			}
// 			if len(updateBatch) >= commentBatchSize {
// 				processDeleteTask(models, &deleteBatch)
// 			}
// 		default:
// 			time.Sleep(10 * time.Millisecond)
// 		}
// 	}
// }

// func processCommentInsertBatch(models *data.Models, batch *[]data.Comment) {
// 	if len(*batch) == 0 {
// 		return
// 	}

// 	logger.PrintInfo("inserting comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	tx, err := models.Comments.DB.BeginTx(ctx, nil)
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	defer tx.Rollback()

// 	successCount := 0
// 	postCommentCounts := make(map[int64]int)
// 	for i := range *batch {
// 		comment := &(*batch)[i]
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.Comments.InsertTx(tx, comment); err != nil {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				// logger.PrintError(fmt.Errorf("failed to insert the comment, attempt:%d", attempt), nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			break
// 		}
// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.CommentStats.InsertTx(tx, comment.ID); err != nil {
// 				attempt++
// 				logger.PrintError(fmt.Errorf("failed to insert the comment stats err: %v", err), nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			postCommentCounts[comment.PostID]++
// 			successCount++
// 			break
// 		}
// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to insert the comment %d after %d attempts", comment.ID, attempt), nil)
// 		}
// 	}
// 	if successCount == 0 {
// 		logger.PrintError(errors.New("No inserts were successful, rolling back transaction"), nil)
// 		return
// 	}

// 	for postID, count := range postCommentCounts {
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err = models.PostStats.UpdateCommentCountTx(tx, postID, count); err != nil {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			break
// 		}
// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to update the comment stats %d after %d attempts", postID, attempt), nil)
// 			return
// 		}
// 	}

// 	err = tx.Commit()
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}

// 	logger.PrintInfo("processed comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	*batch = (*batch)[:0]
// }

// func processUpdateTask(models *data.Models, batch *[]data.Comment) {
// 	if len(*batch) == 0 {
// 		return
// 	}

// 	logger.PrintInfo("updating comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	tx, err := models.Comments.DB.BeginTx(ctx, nil)
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	defer tx.Rollback()

// 	successCount := 0
// 	for i := range *batch {
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.Comments.UpdateTx(tx, &(*batch)[i]); err != nil && err != data.ErrEditConflict {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				logger.PrintError(fmt.Errorf("failed to update the comment %d, attempt:%d", (*batch)[i].ID, attempt), nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			successCount++
// 			break
// 		}

// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to update the comment %d after %d attempts", (*batch)[i].ID, attempt), nil)
// 		}
// 	}
// 	if successCount == 0 {
// 		logger.PrintError(errors.New("No updates are successful, rolling back transactions"), nil)
// 		return
// 	}
// 	if err = tx.Commit(); err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	logger.PrintInfo("processed update comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	*batch = (*batch)[:0]
// }

// func processDeleteTask(models *data.Models, batch *[]data.Comment) {
// 	if len(*batch) == 0 {
// 		return
// 	}

// 	logger.PrintInfo("deleting comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	tx, err := models.Comments.DB.BeginTx(ctx, nil)
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	defer tx.Rollback()

// 	successCount := 0
// 	for i := range *batch {
// 		comment := &(*batch)[i]
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.Comments.Delete(tx, comment.ID, comment.User.ID); err != nil && err != data.ErrRecordNotFound {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				logger.PrintError(fmt.Errorf("failed to delete the comment %d, attempt:%d", comment.ID, attempt), nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			successCount++
// 			break
// 		}

// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to delete the comment %d after %d attempts", comment.ID, attempt), nil)
// 		}
// 	}
// 	if successCount == 0 {
// 		logger.PrintError(errors.New("No updates are successful, rolling back transactions"), nil)
// 		return
// 	}
// 	if err = tx.Commit(); err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	logger.PrintInfo("processed delete comments batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	*batch = (*batch)[:0]
// }
