
const express = require("express");
const router = express.Router();
const MessageController = require('../Controllers/message');
const auth = require('../Authentication/auth');

// Handle image upload with multer middleware
router.post('/post-message-chat', auth, MessageController.uploadMiddleware, MessageController.sendMessage);
router.get('/get-message-chat/:convId', auth, MessageController.getMessage);

module.exports = router;