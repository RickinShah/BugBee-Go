const pool = require("../Database/conn");

exports.addConversation = async (req, res) => {
    try {
        let senderId = req.user._id;
        let { recieverId } = req.body;

        const receiverIdResult = await pool.query(
            `
            SELECT user_pid FROM users WHERE username = $1
            `,
            [recieverId],
        );
        recieverId = receiverIdResult.rows[0]?.user_pid;

        const result = await pool.query(`
            INSERT INTO conversations DEFAULT VALUES RETURNING *
        `);
        const newConversationPg = result.rows[0];

        await pool.query(
            `
            INSERT INTO conversation_members(conversation_id, user_id)
            VALUES ($1, $2), ($1, $3)
        `,
            [newConversationPg.conversation_pid, senderId, recieverId],
        );

        res.status(200).json({
            message: "Conversation Created Successfully",
            conversation: newConversationPg,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getConversation = async (req, res) => {
    try {
        let loggedInId = req.user._id;

        const { rows } = await pool.query(
            `WITH user_conversations AS (
                SELECT DISTINCT conversation_id
                FROM conversation_members
                WHERE user_id = $1
            ),
            conversation_data AS (
                SELECT
                    c.conversation_pid,
                    c.created_at,
                    c.updated_at,
                    -- Aggregate all members including current user
                    jsonb_agg(DISTINCT jsonb_build_object(
                        '_id', u.user_pid,
                        'name', COALESCE(u.name, 'Deleted User'),
                        'username', COALESCE(u.username, 'deleted_user'),
                        'profile_path', COALESCE(u.profile_path, '/profiles/default.png')
                    )) AS members
                FROM conversations c
                JOIN conversation_members cm ON c.conversation_pid = cm.conversation_id
                JOIN users u ON cm.user_id = u.user_pid
                WHERE c.conversation_pid IN (SELECT conversation_id FROM user_conversations)
                GROUP BY c.conversation_pid, c.created_at, c.updated_at
            )
            SELECT
                conversation_pid AS _id,
                created_at,
                updated_at,
                members
            FROM conversation_data
            ORDER BY updated_at DESC;
                    `,
            [loggedInId],
        );
        const conversations = rows;
        console.log(conversations);

        res.status(200).json({
            message: "Conversation Fetched Successfully",
            conversations,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
