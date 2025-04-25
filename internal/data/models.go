package data

import (
	"database/sql"
	"errors"
	"os"

	"github.com/RickinShah/BugBee/internal/jsonlog"
	"github.com/go-redis/redis/v8"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
)

var logger = jsonlog.New(os.Stdout, jsonlog.LevelInfo)

type Models struct {
	Posts            PostModel
	PostStats        PostStatsModel
	PostVotes        PostVoteModel
	Users            UserModel
	Tokens           TokenModel
	OTPs             OTPModel
	Comments         CommentModel
	CommentVotes     CommentVoteModel
	CommentStats     CommentStatsModel
	PendingUsers     PendingUserModel
	Communities      CommunityModel
	Files            FileModel
	Permissions      PermissionModel
	CommunityRoles   CommunityRoleModel
	CommunityMembers CommunityMemberModel
	RolePermissions  RolePermissionModel
	UserRoles        UserRoleModel
	Channels         ChannelModel
	Conversations    ConversationModel
	Messages         MessageModel
}

func NewModels(db *sql.DB, redis *redis.Client) Models {
	return Models{
		Posts:            PostModel{DB: db, Redis: redis},
		PostStats:        PostStatsModel{DB: db, Redis: redis},
		PostVotes:        PostVoteModel{DB: db, Redis: redis},
		Users:            UserModel{DB: db, Redis: redis},
		Tokens:           TokenModel{DB: db, Redis: redis},
		OTPs:             OTPModel{DB: db, Redis: redis},
		Comments:         CommentModel{DB: db, Redis: redis},
		CommentVotes:     CommentVoteModel{DB: db, Redis: redis},
		CommentStats:     CommentStatsModel{DB: db, Redis: redis},
		PendingUsers:     PendingUserModel{DB: db, Redis: redis},
		Communities:      CommunityModel{DB: db, Redis: redis},
		Files:            FileModel{DB: db, Redis: redis},
		Permissions:      PermissionModel{DB: db, Redis: redis},
		CommunityRoles:   CommunityRoleModel{DB: db, Redis: redis},
		CommunityMembers: CommunityMemberModel{DB: db, Redis: redis},
		RolePermissions:  RolePermissionModel{DB: db, Redis: redis},
		UserRoles:        UserRoleModel{DB: db, Redis: redis},
		Channels:         ChannelModel{DB: db, Redis: redis},
		Conversations:    ConversationModel{DB: db, Redis: redis},
		Messages:         MessageModel{DB: db, Redis: redis},
	}
}
