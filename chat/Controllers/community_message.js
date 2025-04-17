const pool = require("../Database/conn")

exports.sendCommunityMessage = async (req, res) => {
    try {
        let { conversation, content } = req.body;
        let imageUrl = "";

        if (req.file) {
            imageUrl = req.file.path.replace(/\\/g, "/");
        }

        const result = await pool.query(
            `INSERT INTO channel_messages(channel_id, sender_id, message, image_url, updated_at) VALUES($1, $2, $3, $4, now()) RETURNING message_pid, created_at`,
            [conversation, req.user._id, content || "", imageUrl],
        );

        const addMessage = {
            _id: result.rows[0].message_pid,
            sender: {
                _id: req.user._id,
                name: req.user.name,
                username: req.user.username,
                profile_path:
                    req.user.profilePath || "/bugbee/profiles/default.png",
            },
            conversation: conversation,
            message: content || "",
            imageUrl: imageUrl,
            createdAt: result.rows[0].created_at,
            displayTime: formatMessageTime(result.rows[0].created_at),
        };

        res.status(201).json({ message: addMessage });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


exports.getCommunityMessage = async (req, res) => {
    try {
        let { convId } = req.params;

        const result = await pool.query(`
            SELECT m.message_pid, m.message, m.image_url, m.created_at, u.user_pid, u.username, u.name, u.profile_path
            FROM channel_messages m
            LEFT JOIN users u on m.sender_id = u.user_pid
            WHERE m.channel_id = $1
            ORDER BY m.created_at ASC
        `,
            [convId],
        );

        const message = result.rows.map((row) => ({
            _id: row.message_pid,
            message: row.message,
            imageUrl: row.image_url,
            createdAt: row.created_at,
            sender: {
                _id: row.user_pid,
                name: row.name,
                username: row.username,
                profile_path:
                    row.profile_path || "/bugbee/profiles/default.png",
            },
        }));

        res.status(200).json({
            message: "Message Fetched Successfully",
            message,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}
