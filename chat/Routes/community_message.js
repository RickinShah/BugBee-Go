const express = require("express");
const router = express.Router();
const CommunityMessageController = require('../Controllers/community_message')
const auth = require('../Authentication/auth');
const MessageController = require("../Controllers/message")

// Handle image upload with multer middleware

router.post('/chat', auth, MessageController.uploadMiddleware, CommunityMessageController.sendCommunityMessage);
router.get('/chat/:convId', auth, CommunityMessageController.getCommunityMessage);

module.exports = router;
