package main

import (
	"net/http"
)

func (app *application) routes() http.Handler {
	router := http.NewServeMux()

	// router.NotFound = http.HandlerFunc(app.notFoundResponse)
	// router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandleFunc("GET /v1/healthcheck", app.healthcheckHandler)

	// User Sign Up and Settings
	router.HandleFunc("POST /v1/users", app.registerUserHandler)
	router.HandleFunc("PUT /v1/users/activated", app.activateUserHandler)
	router.HandleFunc("PATCH /v1/register/email", app.registerEmailHandler)
	router.HandleFunc("PATCH /v1/register/username", app.registerUsernameHandler)
	router.HandleFunc("POST /v1/profile", app.requireActivatedUser(app.updateProfileHandler))
	router.HandleFunc("GET /v1/users/{username}", app.requireActivatedUser(app.getUserHandler))
	router.HandleFunc("GET /v1/user", app.requireActivatedUser(app.getUserData))
	router.HandleFunc("GET /v1/users", app.requireActivatedUser(app.searchUserHandler))
	router.HandleFunc("DELETE /v1/users", app.requireAuthenticatedUser(app.deleteUserHandler))
	router.HandleFunc("POST /v1/users/logout", app.requireAuthenticatedUser(app.logoutHandler))
	router.HandleFunc("PATCH /v1/users", app.requireActivatedUser(app.settingsHandler))
	router.HandleFunc("PATCH /v1/users/password", app.requireActivatedUser(app.changePasswordHandler))

	// Token Generation and Login
	router.HandleFunc("POST /v1/tokens/authentication", app.createAuthenticationHandler)

	// OTP and Forgot Password
	router.HandleFunc("POST /v1/otp", app.generateOtpHandler)
	router.HandleFunc("POST /v1/otp/validate", app.validateOtpHandler)
	router.HandleFunc("PATCH /v1/users/reset-password", app.passwordResetHandler)

	// Communities
	router.HandleFunc("POST /v1/communities", app.requireActivatedUser(app.createCommunityHandler))
	router.HandleFunc("GET /v1/communities/{handle}", app.requireActivatedUser(app.getCommunityHandler))
	router.HandleFunc("POST /v1/community/{handle}/roles", app.requireActivatedUser(app.addCommunityRoleHandler))
	router.HandleFunc("POST /v1/community/{handle}", app.requireActivatedUser(app.joinCommunityHandler))
	router.HandleFunc("POST /v1/community/{handle}/roles/user", app.requireActivatedUser(app.addUserRoleHandler))
	router.HandleFunc("GET /v1/community/{handle}/roles", app.requireActivatedUser(app.getCommunityRolesHandler))
	router.HandleFunc("GET /v1/community/{handle}/members", app.requireActivatedUser(app.getCommunityMembersHandler))
	router.HandleFunc("POST /v1/community/{handle}/channels", app.requireActivatedUser(app.createChannel))
	router.HandleFunc("GET /v1/communities", app.requireActivatedUser(app.getCommunitiesHandler))
	router.HandleFunc("GET /v1/communities/joined", app.requireActivatedUser(app.getJoinedCommunitiesHandler))
	router.HandleFunc("DELETE /v1/communities/{handle}", app.requireActivatedUser(app.deleteCommunityHandler))
	router.HandleFunc("PATCH /v1/communities/{handle}", app.requireActivatedUser(app.updateCommunityHandler))
	router.HandleFunc("DELETE /v1/community/{handle}", app.requireActivatedUser(app.deleteCommunityHandler))
	router.HandleFunc("GET /v1/community/{handle}/channels", app.requireActivatedUser(app.getChannels))
	router.HandleFunc("GET /v1/communities/search", app.requireActivatedUser(app.searchCommunityHandler))
	router.HandleFunc("GET /v1/community/{handle}/permissions", app.requireActivatedUser(app.getUserPermissions))
	router.HandleFunc("GET /v1/community/{handle}/user/roles", app.requireActivatedUser(app.getUserRoles))

	// Permissions
	// router.HandleFunc("POST /v1/permissions", app.insertPermissionHandler)
	// router.HandleFunc("DELETE /v1/permissions/{id}", app.deletePermissionHandler)

	// Post
	router.HandleFunc("POST /v1/posts", app.requireActivatedUser(app.createPostHandler))
	router.HandleFunc("GET /v1/posts/{post_id}", app.requireActivatedUser(app.getPostHandler))
	router.HandleFunc("GET /v1/posts", app.requireActivatedUser(app.getAllPostHandler))
	router.HandleFunc("POST /v1/posts/{post_id}/votes", app.requireActivatedUser(app.createPostVoteHandler))
	router.HandleFunc("DELETE /v1/posts/{post_id}", app.requireActivatedUser(app.deletePostHandler))
	router.HandleFunc("PATCH /v1/posts/{post_id}", app.requireActivatedUser(app.updatePostHandler))

	// Search
	// router.HandleFunc("GET /v1/search/posts", app.searchPostsHandler)

	// Comments & Replies
	router.HandleFunc("POST /v1/posts/{post_id}/comments", app.requireActivatedUser(app.createCommentHandler))
	router.HandleFunc("PATCH /v1/posts/{post_id}/comments/{comment_id}", app.requireActivatedUser(app.updateCommentHandler))
	router.HandleFunc("DELETE /v1/posts/{post_id}/comments/{comment_id}", app.requireActivatedUser(app.deleteCommentHandler))
	router.HandleFunc("POST /v1/posts/{post_id}/comments/{comment_id}/vote", app.requireActivatedUser(app.createCommentVoteHandler))
	router.HandleFunc("GET /v1/posts/{post_id}/comments", app.requireActivatedUser(app.getComments))

	// Follower & Following
	// router.HandleFunc("POST /v1/users/{username}/follow", app.followUserHandler)
	// router.HandleFunc("DELETE /v1/users/{username}/follow", app.unfollowUserHandler)
	// router.HandleFunc("GET /v1/users/{username}/followers", app.getAllFollowersHandler)
	// router.HandleFunc("GET /v1/users/{username}/following", app.getAllFollowingHandler)
	//
	router.HandleFunc("POST /v1/permissions", app.addPermissionHandler)

	router.HandleFunc("GET /v1/conversations", app.requireActivatedUser(app.getConversations))
	router.HandleFunc("POST /v1/conversations", app.requireActivatedUser(app.addConversation))

	router.HandleFunc("POST /v1/chats", app.requireActivatedUser(app.addMessage))
	router.HandleFunc("GET /v1/chats/{conv_id}", app.requireActivatedUser(app.getMessages))

	router.HandleFunc("POST /v1/channel/chats", app.requireActivatedUser(app.addChannelMessage))
	router.HandleFunc("GET /v1/channel/chats/{channel_id}", app.requireActivatedUser(app.getChannelMessages))
	router.HandleFunc("GET /v1/user/check", app.requireActivatedUser(app.checkLogin))

	//return app.recoverPanic(app.rateLimit(router))
	return app.recoverPanic(app.enableCORS(app.authenticate(router)))
}
