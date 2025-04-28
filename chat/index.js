const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const PORT = process.env.PORT || 8000;
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const server = http.createServer(app);
require('dotenv').config();

const clients = process.env.CLIENTS
allowedOrigins = clients.split(",")

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (allowedOrigins.includes(origin) || !origin) {
                callback(null, true); // Allow the connection
            } else {
                callback(new Error("Not allowed by CORS"), false); // Reject the connection
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
    },
});

const ConversationRoutes = require("./Routes/conversation");
const MessageRoutes = require("./Routes/message");
const CommunityMessageRoutes = require("./Routes/community_message");

require("./Database/conn");

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

io.on("connection", (socket) => {
    console.log("user connected");

    socket.on("joinConversation", (conversationId) => {
        console.log(`user joined conversation id of ${conversationId}`);
        socket.join(conversationId);
    });

    socket.on("sendMessage", (convId, messageDetail) => {
        console.log("message sent");

        io.to(convId).emit("receiveMessage", messageDetail);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("joinChannel", (channelId) => {
        console.log(`user joined channel id of ${channelId}`)
        socket.join(channelId);
    })

});

app.use(
    cors({
        credentials: true,
        origin: (origin, callback) => {
            if (allowedOrigins.includes(origin) || !origin) {
                callback(null, true); // Allow the request
            } else {
                callback(new Error("Not allowed by CORS"), false); // Reject the request
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use("/api/conversation", ConversationRoutes);
app.use("/api/chat", MessageRoutes);
app.use("/api/channels", CommunityMessageRoutes);

app.get("/", (req, res) => {
    res.send({ message: "Hello World!" });
});

server.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});
