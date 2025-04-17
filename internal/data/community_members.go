package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

type CommunityMember struct {
	UserID      int64     `json:"user_id" db:"user_id"`
	CommunityID int64     `json:"community" db:"communities"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type CommunityMemberModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommunityMemberModel) Get(communityID int64) ([]*User, error) {
	query := `
		SELECT u.username, u.name, u.profile_path
		FROM community_members c
		LEFT JOIN users u ON c.user_id = u.user_pid
		WHERE community_id = $1
		ORDER BY u.username ASC
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{communityID}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var users []*User
	for rows.Next() {
		var user User

		if err := rows.Scan(&user.Username, &user.Name, &user.ProfilePath); err != nil {
			return nil, err
		}
		user.SetMarshalType(3)
		users = append(users, &user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (m CommunityMemberModel) Delete(userID, communityID int64) error {
	query := `
		DELETE FROM community_members
		WHERE user_id = $1, community_id = $2
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	args := []any{userID, communityID}

	result, err := tx.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrEditConflict
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m CommunityMemberModel) GetAllCommunities(userID int64) ([]*Community, error) {
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

		communities = append(communities, &community)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return communities, err
}

func (m CommunityMemberModel) InsertTx(tx *sql.Tx, cm *CommunityMember) error {
	query := `
		INSERT INTO community_members (user_id, community_id)
		VALUES ($1, $2)
		ON CONFLICT
		DO NOTHING
		RETURNING created_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{cm.UserID, cm.CommunityID}

	err := tx.QueryRowContext(ctx, query, args...).Scan(&cm.CreatedAt)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}
	return nil
}

func (m CommunityMemberModel) Insert(cm *CommunityMember) error {
	query := `
		INSERT INTO community_members (user_id, community_id)
		VALUES ($1, $2)
		RETURNING created_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{cm.UserID, cm.CommunityID}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&cm.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}
