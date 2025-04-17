const express = require("express");
const router = express.Router();
const auth = require('../Authentication/auth');
const ConversationController = require('../Controllers/conversation');




router.post('/add-conversation',auth,ConversationController.addConversation)
router.get('/get-conversation',auth,ConversationController.getConversation)

module.exports = router;






/*const express = require("express");
const router = express.Router();
const auth = require('../Authentication/auth');
const ConversationController = require('../Controllers/conversation');


router.post('/add-conversation', auth, ConversationController.addConversation);
router.get('/get-conversation', auth, ConversationController.getConversation);

// Delete conversation route - properly integrated
router.delete('/delete-conversation/:id', auth, async (req, res) => {
    try {
        const conversationId = req.params.id;
        
        // First verify that the user is part of this conversation
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        
        // Check if the current user is a member of this conversation
        const isUserMember = conversation.members.some(
            (member) => member.toString() === req.user._id.toString()
        );
        
        if (!isUserMember) {
            return res.status(403).json({ message: 'Not authorized to delete this conversation' });
        }
        
        // Delete all messages associated with this conversation
        await Message.deleteMany({ conversation: conversationId });
        
        // Delete the conversation itself
        await Conversation.findByIdAndDelete(conversationId);
        
        res.status(200).json({ message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;*/


