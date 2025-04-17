const jwt = require("jsonwebtoken");
const pool = require("../Database/conn");
const crypto = require("crypto");

const auth = async (req, res, next) => {
    const auth_token = req.cookies.auth_token;
    if (!auth_token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const tokenHash = crypto.createHash("sha256").update(auth_token).digest();
    try {
        let result = await pool.query(
            `
    		SELECT users.user_pid, users.created_at, users.name, users.username, users.email, users.profile_path, users.password_hash,
    			   users.activated, users.version, users.show_nsfw, users.profile_path, users.updated_at, users.bio, tokens.expiry
    		FROM users
    		INNER JOIN tokens
    		ON users.user_pid = tokens.user_id
    		WHERE tokens.Hash = $1
    		AND tokens.scope = $2
    		AND tokens.expiry > $3
		`,
            [tokenHash, "authentication", new Date()],
        );

        const row = result.rows[0];
        const user = {
            _id: row.user_pid,
            createdAt: row.created_at,
            name: row.name,
            username: row.username,
            email: row.email,
            password: {
                hash: row.password_hash,
            },
            activated: row.activated,
            version: row.version,
            showNsfw: row.show_nsfw,
            profilePath: row.profile_path,
            updatedAt: row.updated_at,
            bio: row.bio,
        };

        req.user = user;
        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
module.exports = auth;
