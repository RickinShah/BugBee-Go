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
	router.HandleFunc("POST /v1/profile", app.updateProfileHandler)
	router.HandleFunc("GET /v1/users/{username}", app.getUserHandler)
	router.HandleFunc("GET /v1/user", app.getUserData)
	router.HandleFunc("GET /v1/users", app.searchUserHandler)
	router.HandleFunc("DELETE /v1/users", app.requireAuthenticatedUser(app.deleteUserHandler))
	router.HandleFunc("POST /v1/users/logout", app.logoutHandler)
	router.HandleFunc("PATCH /v1/users", app.settingsHandler)
	router.HandleFunc("PATCH /v1/users/password", app.changePasswordHandler)

	// Token Generation and Login
	router.HandleFunc("POST /v1/tokens/authentication", app.createAuthenticationHandler)

	// OTP and Forgot Password
	router.HandleFunc("POST /v1/otp", app.generateOtpHandler)
	router.HandleFunc("POST /v1/otp/validate", app.validateOtpHandler)
	router.HandleFunc("PATCH /v1/users/reset-password", app.passwordResetHandler)

	// Communities
	router.HandleFunc("POST /v1/communities", app.createCommunityHandler)
	router.HandleFunc("GET /v1/communities/{handle}", app.getCommunityHandler)
	router.HandleFunc("POST /v1/community/{handle}/roles", app.addCommunityRoleHandler)
	router.HandleFunc("POST /v1/community/{handle}", app.joinCommunityHandler)
	router.HandleFunc("POST /v1/community/{handle}/roles/user", app.addUserRoleHandler)
	router.HandleFunc("GET /v1/community/{handle}/roles", app.getCommunityRolesHandler)
	router.HandleFunc("GET /v1/community/{handle}/members", app.getCommunityMembersHandler)
	router.HandleFunc("POST /v1/community/{handle}/channels", app.createChannel)
	router.HandleFunc("GET /v1/communities", app.getCommunitiesHandler)
	router.HandleFunc("GET /v1/communities/joined", app.getJoinedCommunitiesHandler)
	router.HandleFunc("DELETE /v1/communities/{handle}", app.deleteCommunityHandler)
	router.HandleFunc("PATCH /v1/communities/{handle}", app.updateCommunityHandler)
	router.HandleFunc("DELETE /v1/community/{handle}", app.deleteCommunityHandler)
	router.HandleFunc("GET /v1/community/{handle}/channels", app.getChannels)
	router.HandleFunc("GET /v1/communities/search", app.searchCommunityHandler)

	// Permissions
	// router.HandleFunc("POST /v1/permissions", app.insertPermissionHandler)
	// router.HandleFunc("DELETE /v1/permissions/{id}", app.deletePermissionHandler)

	// Post
	router.HandleFunc("POST /v1/posts", app.createPostHandler)
	router.HandleFunc("GET /v1/posts/{post_id}", app.getPostHandler)
	router.HandleFunc("GET /v1/posts", app.getAllPostHandler)
	router.HandleFunc("POST /v1/posts/{post_id}/votes", app.createPostVoteHandler)
	router.HandleFunc("DELETE /v1/posts/{post_id}", app.deletePostHandler)
	router.HandleFunc("PATCH /v1/posts/{post_id}", app.updatePostHandler)

	// Search
	// router.HandleFunc("GET /v1/search/posts", app.searchPostsHandler)

	// Comments & Replies
	router.HandleFunc("POST /v1/posts/{post_id}/comments", app.createCommentHandler)
	router.HandleFunc("PATCH /v1/posts/{post_id}/comments/{comment_id}", app.updateCommentHandler)
	router.HandleFunc("DELETE /v1/posts/{post_id}/comments/{comment_id}", app.deleteCommentHandler)
	router.HandleFunc("POST /v1/posts/{post_id}/comments/{comment_id}/vote", app.createCommentVoteHandler)
	router.HandleFunc("GET /v1/posts/{post_id}/comments", app.getComments)

	// Follower & Following
	// router.HandleFunc("POST /v1/users/{username}/follow", app.followUserHandler)
	// router.HandleFunc("DELETE /v1/users/{username}/follow", app.unfollowUserHandler)
	// router.HandleFunc("GET /v1/users/{username}/followers", app.getAllFollowersHandler)
	// router.HandleFunc("GET /v1/users/{username}/following", app.getAllFollowingHandler)
	//
	router.HandleFunc("POST /v1/permissions", app.addPermissionHandler)

	router.HandleFunc("GET /v1/conversations", app.getConversations)
	router.HandleFunc("POST /v1/conversations", app.addConversation)

	router.HandleFunc("POST /v1/chats", app.addMessage)
	router.HandleFunc("GET /v1/chats/{conv_id}", app.getMessages)

	router.HandleFunc("POST /v1/channel/chats", app.addChannelMessage)
	router.HandleFunc("GET /v1/channel/chats/{channel_id}", app.getChannelMessages)

	//return app.recoverPanic(app.rateLimit(router))
	return app.recoverPanic(app.enableCORS(app.authenticate(router)))
}
