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

// type CommentVoteTask struct {
// 	Type string
// 	Data data.CommentVote
// }

// var (
// 	commentVoteBatchSize = 100
// 	commentVoteTaskChan  = make(chan CommentVoteTask, 200)
// )

// func ProcessCommentVoteTask(models *data.Models) asynq.HandlerFunc {
// 	return func(ctx context.Context, t *asynq.Task) error {
// 		var commentVote data.CommentVote
// 		if err := json.Unmarshal(t.Payload(), &commentVote); err != nil {
// 			return err
// 		}
// 		select {
// 		case commentVoteTaskChan <- CommentVoteTask{t.Type(), commentVote}:
// 		default:
// 			logger.PrintError(errors.New("postvote queue is full"), nil)
// 			return errors.New("postvote queue is full, retrying..")
// 		}
// 		return nil
// 	}
// }

// func StartCommentVoteBatchProcessor(ctx context.Context, models *data.Models) {
// 	var commentVoteBatch []data.CommentVote
// 	ticker := time.NewTicker(2 * time.Second)
// 	defer ticker.Stop()

// 	for {
// 		select {
// 		case <-ctx.Done():
// 			logger.PrintInfo("Shutting down post vote batch processor", nil)
// 			if len(commentVoteBatch) > 0 {
// 				processCommentVoteBatch(models, &commentVoteBatch)
// 			}
// 			return
// 		case <-ticker.C:
// 			if len(commentVoteBatch) > 0 {
// 				processCommentVoteBatch(models, &commentVoteBatch)
// 			}
// 		case commentVoteTask := <-commentVoteTaskChan:
// 			commentVoteBatch = append(commentVoteBatch, commentVoteTask.Data)

// 			if len(commentVoteBatch) >= commentVoteBatchSize {
// 				processCommentVoteBatch(models, &commentVoteBatch)
// 			}
// 		default:
// 			time.Sleep(10 * time.Millisecond)
// 		}
// 	}
// }

// func processCommentVoteBatch(models *data.Models, batch *[]data.CommentVote) {
// 	if len(*batch) == 0 {
// 		return
// 	}

// 	logger.PrintInfo("inserting commentvote batch", map[string]string{"count": strconv.Itoa(len(*batch))})

// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	tx, err := models.CommentVotes.DB.BeginTx(ctx, nil)
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	defer tx.Rollback()

// 	successCount := 0
// 	commentVoteCounts := make(map[int64]voteCount)
// 	for i := range *batch {
// 		commentVote := &(*batch)[i]
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			existingVote, err := models.CommentVotes.Get(tx, commentVote.CommentID, commentVote.UserID)
// 			if err != nil && err != data.ErrRecordNotFound {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}

// 			err = models.CommentVotes.Insert(tx, commentVote)
// 			if err != nil {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}

// 			count := commentVoteCounts[commentVote.CommentID]

// 			if existingVote != nil {
// 				if existingVote.VoteType == 1 {
// 					count.Upvotes--
// 				} else if existingVote.VoteType == -1 {
// 					count.Downvotes--
// 				}
// 			}
// 			if commentVote.VoteType == 1 {
// 				count.Upvotes++
// 			} else if commentVote.VoteType == -1 {
// 				count.Downvotes++
// 			}

// 			commentVoteCounts[commentVote.CommentID] = count
// 			successCount++
// 			break
// 		}
// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to insert the comment %d, user %d after %d attempts", commentVote.CommentID, commentVote.UserID, attempt), nil)
// 		}
// 	}

// 	if successCount == 0 {
// 		logger.PrintError(errors.New("No inserts were successful, rolling back transaction"), nil)
// 		return
// 	}

// 	for postID, voteCount := range commentVoteCounts {
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.CommentStats.UpdateVoteCount(tx, postID, voteCount.Upvotes, voteCount.Downvotes); err != nil {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}
// 			break
// 		}
// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to update the post stats %d after %d attempts", postID, attempt), nil)
// 			return
// 		}
// 	}
// 	tx.Commit()
// 	logger.PrintInfo("processed postvote batch", map[string]string{"count": strconv.Itoa(len(*batch))})
// 	*batch = (*batch)[:0]

// }
