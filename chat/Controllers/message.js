const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../Database/conn");

// Configure multer storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = "uploads/images";

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Filter for image files only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

exports.uploadMiddleware = upload.single("image");

exports.sendMessage = async (req, res) => {
    try {
        let { conversation, content } = req.body;
        let imageUrl = "";

        // If there's an uploaded file
        if (req.file) {
            imageUrl = req.file.path.replace(/\\/g, "/"); // Normalize path for both Windows and Unix
        }

        const result = await pool.query(
            `INSERT INTO messages(conversation_id, sender_id, message, image_url, updated_at) VALUES($1, $2, $3, $4, now()) RETURNING message_pid, created_at`,
            [conversation, req.user._id, content || "", imageUrl],
        );

        const addMessage = {
            _id: result.rows[0].message_pid,
            sender: {
                _id: req.user._id,
                name: req.user.name,
                username: req.user.username,
                profile_path:
                    req.user.profilePath || "/profiles/default.png",
            },
            conversation: conversation,
            message: content || "",
            imageUrl: imageUrl,
            createdAt: result.rows[0].created_at,
            displayTime: formatMessageTime(result.rows[0].created_at),
        };

        res.status(201).json(addMessage);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getMessage = async (req, res) => {
    try {
        let { convId } = req.params;

        const result = await pool.query(
            `
            SELECT m.message_pid, m.message, m.image_url, m.created_at, u.user_pid, u.username, u.name, u.profile_path
            FROM messages m
            LEFT JOIN users u on m.sender_id = u.user_pid
            WHERE m.conversation_id = $1
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
                name: row.name || "Deleted User",
                username: row.username || "deleted_user",
                profile_path:
                    row.profile_path || "/profiles/default.png",
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
