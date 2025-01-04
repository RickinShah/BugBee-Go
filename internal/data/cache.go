package data

import (
	"context"
	"encoding/json"
	"github.com/go-redis/redis/v8"
	"log"
	"time"
)

func CacheSet[T any](r *redis.Client, key string, item *T, ttl time.Duration) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	itemJSON, err := json.Marshal(item)
	if err != nil {
		log.Println(err)
		return
	}

	err = r.Set(ctx, key, itemJSON, ttl).Err()
	if err != nil {
		log.Println(err)
	}
}

func CacheDel(r *redis.Client, key string) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err := r.Del(ctx, key).Err()
	if err != nil {
		log.Println(err)
	}
}

func CacheGet(r *redis.Client, key string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	dataJSON, err := r.Get(ctx, key).Result()

	if err != nil {
		return "", err
	}

	return dataJSON, nil
}
