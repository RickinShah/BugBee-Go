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

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

var (
	ErrDuplicateCommunityHandle = errors.New("duplicate community_handle")
)

const CommunityCacheDuration = 30 * time.Minute

type Community struct {
	ID          int64     `json:"community_id,string" db:"community_pid"`
	CreatorID   *int64    `json:"creator_id,string" db:"creator_id"`
	Handle      string    `json:"community_handle" db:"handle"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	ProfilePath *string   `json:"profile_path" db:"profile_path"`
	IsOfficial  bool      `json:"is_official" db:"is_official"`
	MemberCount int       `json:"member_count" db:"member_count"`
	Version     int       `json:"version" db:"version"`
	marshalType MarshalType
}

func (c *Community) MarshalJSON() ([]byte, error) {
	community := make(map[string]any, 9)

	if c.marshalType == 0 {
		c.marshalType = Full
	}

	if c.marshalType == Frontend || c.marshalType == Full || c.marshalType == Minimal || c.marshalType == IDOnly {
		community["community_id"] = strconv.FormatInt(c.ID, 10)
	}

	if c.marshalType == Frontend || c.marshalType == Full || c.marshalType == Minimal {
		community["community_handle"] = c.Handle
		community["name"] = c.Name
		if c.ProfilePath == nil {
			community["profile_path"] = "/profiles/default.png"
		} else {
			community["profile_path"] = c.ProfilePath
		}
	}
	if c.marshalType == Frontend || c.marshalType == Full {
		community["member_count"] = c.MemberCount
		if c.CreatorID != nil {
			community["creator_id"] = strconv.FormatInt(*c.CreatorID, 10)
		}
		community["description"] = c.Description
		community["updated_at"] = c.UpdatedAt
		community["created_at"] = c.CreatedAt
		community["is_official"] = c.IsOfficial
	}
	if c.marshalType == Full {
		community["version"] = c.Version
	}
	return json.Marshal(community)
}

func (c *Community) SetMarshalType(marshalType MarshalType) {
	c.marshalType = marshalType
}

func ValidateHandle(v *validator.Validator, handle string) {
	v.Check(handle != "", "community handle", "must be provided")
	v.Check(len(handle) <= 30, "community handle", "must not be more than 30 characters")
	v.Check(validator.Matches(handle, validator.UsernameRX), "community handle", "should only contain alphanumeric characters and underscore")
}

func ValidateCreatorID(v *validator.Validator, userID, creatorID int64) {
	v.Check(userID == creatorID, "error", "only the creator can delete the community")
}

type CommunityModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommunityModel) Insert(tx *sql.Tx, community *Community) error {
	query := `
		INSERT INTO communities(creator_id, handle, name)
		VALUES ($1, $2, $3)
		RETURNING community_pid, created_at, version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{
		community.CreatorID,
		community.Handle,
		community.Name,
	}

	err := tx.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.CreatedAt,
		&community.Version,
	)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}
	go m.CacheJoinedCommunities(*community.CreatorID, community.Handle)
	go m.CacheSingleCommunity(community)
	return nil
}

func (m CommunityModel) UpdateTx(tx *sql.Tx, community *Community) error {
	query := `
		UPDATE communities
		SET handle = $1, name = $2, updated_at = now(), profile_path = $3, version = version + 1
		WHERE community_pid = $4 AND version = $5 AND creator_id = $6
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.Handle, community.Name, community.ProfilePath, community.ID, community.Version, community.CreatorID}
	if err := tx.QueryRowContext(ctx, query, args...).Scan(&community.UpdatedAt, &community.Version); err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}
	return nil
}

func (m CommunityModel) UpdateMemberCountTx(tx *sql.Tx, community *Community, delta int) error {
	query := `
		UPDATE communities
		SET member_count = member_count + $1, version = version + 1
		WHERE community_pid = $2 AND version = $3
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.MemberCount, community.ID, community.Version}

	return tx.QueryRowContext(ctx, query, args...).Scan(&community.Version)
}

func (m CommunityModel) UpdatePath(tx *sql.Tx, community *Community) error {
	query := `
		UPDATE communities
		SET profile_path = $1
		WHERE community_pid = $2 AND version = $3
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.ProfilePath, community.ID, community.Version}

	return tx.QueryRowContext(ctx, query, args...).Scan(&community.Version)
}

func (m CommunityModel) Update(community *Community) error {
	query := `
		UPDATE communities
		SET handle = $1, name = $2, description = $3, profile_path = $4, updated_at = now(), version = version + 1
		WHERE community_pid = $5 AND version = $6
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{
		community.Handle,
		community.Name,
		community.Description,
		community.ProfilePath,
		community.ID,
		community.Version,
	}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&community.Version)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}

	CacheDel(m.Redis, m.generateCacheKey(community.Handle))
	return nil
}

func (m CommunityModel) SearchCommunities(name string, limit int) ([]*Community, error) {
	query := `
		WITH similarity_scores AS (
			SELECT handle, name, profile_path,
			GREATEST(word_similarity(name, $1), word_similarity(handle, $1)) AS match_similarity
			FROM communities
			WHERE name % $1 OR handle % $1
			ORDER BY match_similarity DESC
			LIMIT $2
		)
		SELECT handle, name, profile_path, match_similarity
		FROM similarity_scores
		UNION ALL
		SELECT handle, name, profile_path,
		GREATEST(word_similarity(handle, $1), word_similarity(name, $1)) AS match_similarity
		FROM communities
		WHERE NOT EXISTS (SELECT 1 FROM similarity_scores)
		AND (handle ^@ $1 OR name ^@ $1)
		ORDER BY match_similarity DESC NULLS LAST
		LIMIT $2;
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{name, limit}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	type tempCommunity struct {
		Handle          string  `json:"handle" db:"handle"`
		Name            string  `json:"name" db:"name"`
		ProfilePath     *string `json:"profile_path" db:"profile_path"`
		MatchSimilarity float64 `json:"match_similarity" db:"match_similarity"`
	}

	var communities []*Community

	for rows.Next() {
		var temp tempCommunity
		if err := rows.Scan(
			&temp.Handle,
			&temp.Name,
			&temp.ProfilePath,
			&temp.MatchSimilarity,
		); err != nil {
			return nil, err
		}
		communities = append(communities, &Community{
			Handle:      temp.Handle,
			Name:        temp.Name,
			ProfilePath: temp.ProfilePath,
			marshalType: Minimal,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	return communities, nil
}

func (m CommunityModel) GetByHandle(handle string) (*Community, error) {
	query := `
		SELECT community_pid, handle, name, description, created_at, updated_at, profile_path, is_official, member_count, version
		FROM communities
		WHERE handle = $1
	`

	community := Community{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{handle}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.Handle,
		&community.Name,
		&community.Description,
		&community.CreatedAt,
		&community.UpdatedAt,
		&community.ProfilePath,
		&community.IsOfficial,
		&community.MemberCount,
		&community.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(community Community) {
		CacheSet(m.Redis, m.generateCacheKey(handle), &community, CommunityCacheDuration)
	}(community)

	return &community, err
}

func (m CommunityModel) Get(id int64) (*Community, error) {
	query := `
		SELECT community_pid, handle, name, description, created_at, updated_at, profile_path, is_official, member_count, version
		FROM communities
		WHERE community_pid = $1
	`
	community := Community{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{id}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.Handle,
		&community.Name,
		&community.Description,
		&community.CreatedAt,
		&community.UpdatedAt,
		&community.ProfilePath,
		&community.IsOfficial,
		&community.MemberCount,
		&community.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(community Community) {
		CacheSet(m.Redis, m.generateCacheKey(community.Handle), &community, CommunityCacheDuration)
	}(community)

	return &community, err
}

func (m CommunityModel) Delete(id int64) error {
	query := `
		DELETE FROM communities WHERE community_pid = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{id}

	result, err := m.DB.ExecContext(ctx, query, args)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrRecordNotFound
	}

	return nil
}

func (m CommunityModel) GetAll(filters Filters) ([]*Community, error) {
	cachedCommunities, err := m.GetPopularCommunities(filters)
	if err == nil && cachedCommunities != nil {
		return cachedCommunities, nil
	}

	query := fmt.Sprintf(`
		SELECT community_pid, creator_id, handle, name, created_at, updated_at, profile_path, is_official, member_count, version
		FROM communities
		WHERE community_pid > $1
		ORDER BY %s %s, community_pid ASC
		LIMIT $2
	`, filters.sortColumn(), filters.sortDirection())

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

	var communities []*Community

	for rows.Next() {
		var community Community
		if err := rows.Scan(&community.ID,
			&community.CreatorID,
			&community.Handle,
			&community.Name,
			&community.CreatedAt,
			&community.UpdatedAt,
			&community.ProfilePath,
			&community.IsOfficial,
			&community.MemberCount,
			&community.Version,
		); err != nil {
			return nil, err
		}
		go m.CacheCommunities(&community)
		communities = append(communities, &community)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return communities, nil
}

func (m CommunityModel) CacheCommunities(community *Community) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	score := float64(community.MemberCount)

	community.SetMarshalType(Minimal)
	communityJSON, err := json.Marshal(community)
	if err != nil {
		logger.PrintError(err, map[string]string{"JSON": "Can't convert community to JSON"})
	}

	err = m.Redis.ZAdd(ctx, "communities:popular", &redis.Z{Score: score, Member: communityJSON}).Err()
	if err != nil {
		logger.PrintError(err, map[string]string{"Redis": "Can't insert post in cache"})
	}
}

func (m CommunityModel) GetAllCommunities(userID int64) ([]*Community, error) {
	cachedCommunities, err := m.GetCachedJoinedCommunities(userID)
	if err == nil && cachedCommunities != nil {
		return cachedCommunities, nil
	}
	query := `
		SELECT c.community_pid, c.creator_id, c.handle, c.name, c.created_at, c.updated_at, c.profile_path, c.is_official, c.member_count, c.version
		FROM community_members cm
		LEFT JOIN communities c
		ON cm.community_id = c.community_pid
		WHERE cm.user_id = $1
		ORDER BY handle ASC
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var communities []*Community
	for rows.Next() {
		var community Community

		if err := rows.Scan(
			&community.ID,
			&community.CreatorID,
			&community.Handle,
			&community.Name,
			&community.CreatedAt,
			&community.UpdatedAt,
			&community.ProfilePath,
			&community.IsOfficial,
			&community.MemberCount,
			&community.Version,
		); err != nil {
			return nil, err
		}

		go m.CacheJoinedCommunities(userID, community.Handle)
		communities = append(communities, &community)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return communities, err
}

func (m CommunityModel) CacheJoinedCommunities(userID int64, handle string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	cacheKey := m.cacheKeyForJoinedCommunity(userID)
	memberKey := m.generateCacheKey(handle)
	if err := m.Redis.ZAdd(ctx, cacheKey, &redis.Z{Score: 0, Member: memberKey}).Err(); err != nil {
		logger.PrintError(err, map[string]string{"joined_community": "unable to set cache"})
		return err
	}
	return nil
}

func (m CommunityModel) GetCachedJoinedCommunities(userID int64) ([]*Community, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	cacheKey := m.cacheKeyForJoinedCommunity(userID)

	results, err := m.Redis.ZRangeByLex(ctx, cacheKey, &redis.ZRangeBy{Min: "-", Max: "+"}).Result()
	if err != nil {
		logger.PrintError(err, map[string]string{"community": "get smembers redis"})
		return nil, err
	}
	communities, err := m.communitiesGetPipeline(ctx, results)
	if err != nil {
		logger.PrintError(err, map[string]string{"community": "pipelining error redis"})
		return nil, err
	}
	return communities, nil
}

func (m CommunityModel) GetPopularCommunities(filters Filters) ([]*Community, error) {
	var communities []*Community

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	var max string
	var min string

	if filters.sortDirection() == "ASC" {
		max = "-inf"
		min = strconv.FormatInt(math.MaxInt, 10)
	} else {
		max = strconv.FormatInt(math.MaxInt, 10)
		min = "-inf"
	}

	results, err := m.Redis.ZRevRangeByScore(ctx, "communities:popular", &redis.ZRangeBy{
		Max:    max,
		Min:    min,
		Offset: 0,
		Count:  int64(filters.PageSize),
	}).Result()
	if err != nil {
		return nil, err
	}

	for _, raw := range results {
		var community Community
		if err := json.Unmarshal([]byte(raw), &community); err == nil {
			communities = append(communities, &community)
		}
	}

	return communities, nil
}

func (m CommunityModel) CacheSingleCommunity(community *Community) error {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	cacheKey := m.generateCacheKey(community.Handle)

	communityJSON, err := json.Marshal(community)
	if err != nil {
		logger.PrintError(err, map[string]string{"community": "marshal error"})
		return err
	}

	if err := m.Redis.Set(ctx, cacheKey, communityJSON, CommunityCacheDuration).Err(); err != nil {
		logger.PrintError(err, map[string]string{"community": "unable to set cache"})
		return err
	}

	return nil
}

func (m CommunityModel) communitiesGetPipeline(ctx context.Context, results []string) ([]*Community, error) {
	pipe := m.Redis.Pipeline()
	cmds := make([]*redis.StringCmd, len(results))
	var communities []*Community
	var missingCommunityHandles []string

	for i, key := range results {
		cmds[i] = pipe.Get(ctx, key)
	}

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return nil, err
	}

	for i, cmd := range cmds {
		var community Community
		communityJSON, err := cmd.Result()
		if err != nil {
			handle, err := m.extractCommunityHandle(results[i])
			if err != nil {
				return nil, err
			}
			missingCommunityHandles = append(missingCommunityHandles, handle)
			continue
		}
		if err = json.Unmarshal([]byte(communityJSON), &community); err != nil {
			return nil, err
		}
		communities = append(communities, &community)
	}

	if len(missingCommunityHandles) > 0 {
		go m.cacheCommunity(missingCommunityHandles)
		return nil, errors.New("not cached")
	}
	return communities, nil
}

func (m CommunityModel) cacheCommunity(communityIDs []string) {
	for _, communityID := range communityIDs {
		_, err := m.GetByHandle(communityID)
		if err != nil {
			logger.PrintError(err, map[string]string{"community": "caching error"})
		}
	}
}

func (m CommunityModel) extractCommunityHandle(key string) (string, error) {
	parts := strings.Split(key, ":")
	if len(parts) != 2 {
		return "", errors.New("invalid cache key")
	}

	return parts[1], nil
}

func (m CommunityModel) cacheKeyForJoinedCommunity(userID int64) string {
	return "user:" + strconv.FormatInt(userID, 10) + ":joined_communities"
}

func (m CommunityModel) generateCacheKey(handle string) string {
	return "community:" + handle
}
