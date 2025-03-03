package data

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

func CacheSet[T any](r *redis.Client, key string, item *T, ttl time.Duration) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	itemJSON, err := json.Marshal(item)
	if err != nil {
		log.Println("CacheSet marshal error: ", err)
		return
	}

	err = r.Set(ctx, key, itemJSON, ttl).Err()
	if err != nil {
		log.Println("CacheSet Redis SET error: ", err)
		return
	}

	_, err = r.Get(ctx, key).Result()
	if err != nil {
		log.Printf("CacheSet Verfication Failed: Key %s not found after setting: %v", key, err)
	}
}

func CacheDel(r *redis.Client, key string) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err := r.Del(ctx, key).Err()
	if err != nil {
		log.Println("CacheDel Redis DEL error: ", err)
	}
}

func CacheGet(r *redis.Client, key string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	dataJSON, err := r.Get(ctx, key).Result()

	if err != nil {
		switch {
		case errors.Is(err, redis.Nil):
			// log.Printf("cache key not found: %s", key)
			return "", nil
		default:
			log.Printf("CacheGet error: %v", err)
			return "", err
		}
	}

	return dataJSON, nil
}
