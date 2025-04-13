package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/go-redis/redis/v8"
)

func StartPostVoteWorker(ctx context.Context, m *data.Models, workerID int) {
	go func() {
		queue := fmt.Sprintf("post_vote:queue:%d", workerID)

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
				if err := insertPostVote(ctx, queue, *m); nil == err {
					time.Sleep(100 * time.Millisecond)
				}
			case <-batchTicker.C:
				for range batchSize {
					err := m.Comments.Redis.RPopLPush(ctx, data.PostVoteQueueKey, queue).Err()
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

func insertPostVote(ctx context.Context, key string, m data.Models) error {
	postVotes, err := m.PostVotes.Redis.LRange(ctx, key, 0, -1).Result()
	if err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if len(postVotes) == 0 {
		return nil
	}

	logger.PrintInfo("processing post_votes", map[string]string{"count": strconv.Itoa(len(postVotes))})

	uniqueVote := make(map[string]data.PostVote, len(postVotes))
	batch := make([]*data.PostVote, 0, len(postVotes))
	for _, c := range postVotes {
		var postVote data.PostVote
		err := json.Unmarshal([]byte(c), &postVote)
		if err != nil {
			return err
		}
		tempID := fmt.Sprintf("%d:%d", postVote.PostID, postVote.UserID)
		uniqueVote[tempID] = postVote
	}

	for _, postVote := range uniqueVote {
		batch = append(batch, &postVote)
	}

	tx, err := m.PostVotes.DB.Begin()
	if err != nil {
		logger.PrintError(err, nil)
		return err
	}
	defer tx.Rollback()

	batchCopy := make([]*data.PostVote, len(batch))
	for i, vote := range batch {
		copied := *vote
		batchCopy[i] = &copied
	}
	if err = m.PostVotes.Get(batchCopy); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	existingVotesMap := make(map[string]data.VoteType)
	for _, postVote := range batchCopy {
		key := fmt.Sprintf("%d:%d", postVote.PostID, postVote.UserID)
		existingVotesMap[key] = postVote.VoteType
	}

	if failedPostVotes, err := m.PostVotes.BatchInsertTx(tx, &batch); err != nil {
		logger.PrintError(err, map[string]string{"failed post_votes:": strconv.Itoa(len(failedPostVotes))})
	}

	counts := make(map[int64]*data.VoteCount)

	for _, newVote := range batch {
		key := fmt.Sprintf("%d:%d", newVote.PostID, newVote.UserID)
		existingType, exists := existingVotesMap[key]

		if _, ok := counts[newVote.PostID]; !ok {
			counts[newVote.PostID] = &data.VoteCount{}
		}

		if exists {
			if existingType == data.Upvote {
				counts[newVote.PostID].Upvotes--
			} else if existingType == data.Downvote {
				counts[newVote.PostID].Downvotes--
			}
		}

		if newVote.VoteType == data.Upvote {
			counts[newVote.PostID].Upvotes++
		} else if newVote.VoteType == data.Downvote {
			counts[newVote.PostID].Downvotes++
		}
	}

	if err := m.PostStats.BatchUpdateVoteCount(tx, counts); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if err = m.PostVotes.Redis.Del(ctx, key).Err(); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	if err := tx.Commit(); err != nil {
		logger.PrintError(err, nil)
		return err
	}

	logger.PrintInfo("processed post_votes", map[string]string{"count:": strconv.Itoa(len(batch)), "worker": key})
	return nil
}
