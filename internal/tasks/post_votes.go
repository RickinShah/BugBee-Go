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

// type PostVoteTask struct {
// 	Type string
// 	Data data.PostVote
// }

// var (
// 	postVoteBatchSize = 100
// 	postVoteTaskChan  = make(chan PostVoteTask, 200)
// )

// func ProcessPostVoteTask(models *data.Models) asynq.HandlerFunc {
// 	return func(ctx context.Context, t *asynq.Task) error {
// 		var postVote data.PostVote
// 		if err := json.Unmarshal(t.Payload(), &postVote); err != nil {
// 			return err
// 		}
// 		select {
// 		case postVoteTaskChan <- PostVoteTask{t.Type(), postVote}:
// 		default:
// 			logger.PrintError(errors.New("postvote queue is full"), nil)
// 			return errors.New("postvote queue is full, retrying..")
// 		}
// 		return nil
// 	}
// }

// func StartPostVoteBatchProcessor(ctx context.Context, models *data.Models) {
// 	var postVoteBatch []data.PostVote
// 	ticker := time.NewTicker(2 * time.Second)
// 	defer ticker.Stop()

// 	for {
// 		select {
// 		case <-ctx.Done():
// 			logger.PrintInfo("Shutting down post vote batch processor", nil)
// 			if len(postVoteBatch) > 0 {
// 				processPostVoteBatch(models, &postVoteBatch)
// 			}
// 			return
// 		case <-ticker.C:
// 			if len(postVoteBatch) > 0 {
// 				processPostVoteBatch(models, &postVoteBatch)
// 			}
// 		case postVoteTask := <-postVoteTaskChan: // 			postVoteBatch = append(postVoteBatch, postVoteTask.Data)

// 			if len(postVoteBatch) >= postVoteBatchSize {
// 				processPostVoteBatch(models, &postVoteBatch)
// 			}
// 		default:
// 			time.Sleep(10 * time.Millisecond)
// 		}
// 	}
// }

// type voteCount struct {
// 	Upvotes   int
// 	Downvotes int
// }

// func processPostVoteBatch(models *data.Models, batch *[]data.PostVote) {
// 	if len(*batch) == 0 {
// 		return
// 	}

// 	logger.PrintInfo("inserting postvote batch", map[string]string{"count": strconv.Itoa(len(*batch))})

// 	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
// 	defer cancel()

// 	tx, err := models.PostVotes.DB.BeginTx(ctx, nil)
// 	if err != nil {
// 		logger.PrintError(err, nil)
// 		return
// 	}
// 	defer tx.Rollback()

// 	successCount := 0
// 	postVoteCounts := make(map[int64]voteCount)
// 	for i := range *batch {
// 		postVote := &(*batch)[i]
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			existingVote, err := models.PostVotes.Get(tx, postVote.PostID, postVote.UserID)
// 			if err != nil && err != data.ErrRecordNotFound {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}

// 			err = models.PostVotes.Insert(tx, postVote)
// 			if err != nil {
// 				attempt++
// 				logger.PrintError(err, nil)
// 				time.Sleep(time.Duration(attempt) * 200 * time.Millisecond)
// 				continue
// 			}

// 			count := postVoteCounts[postVote.PostID]

// 			if existingVote != nil {
// 				if existingVote.VoteType == 1 {
// 					count.Upvotes--
// 				} else if existingVote.VoteType == -1 {
// 					count.Downvotes--
// 				}
// 			}
// 			if postVote.VoteType == 1 {
// 				count.Upvotes++
// 			} else if postVote.VoteType == -1 {
// 				count.Downvotes++
// 			}

// 			postVoteCounts[postVote.PostID] = count
// 			successCount++
// 			break
// 		}
// 		if attempt > maxRetries {
// 			logger.PrintError(fmt.Errorf("permanently failed to insert the postvote %d, user %d after %d attempts", postVote.PostID, postVote.UserID, attempt), nil)
// 		}
// 	}

// 	if successCount == 0 {
// 		logger.PrintError(errors.New("No inserts were successful, rolling back transaction"), nil)
// 		return
// 	}

// 	for postID, voteCount := range postVoteCounts {
// 		const maxRetries = 3
// 		var attempt int

// 		for attempt = 1; attempt <= maxRetries; attempt++ {
// 			if err := models.PostStats.UpdateVoteCount(tx, postID, voteCount.Upvotes, voteCount.Downvotes); err != nil {
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
