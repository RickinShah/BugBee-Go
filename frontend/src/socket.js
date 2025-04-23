import { io } from "socket.io-client";
import { chatHost } from "./utils/api.js";

const socket = io(`wss://${chatHost}`, {
    path: "/socket.io",
    transports: ["websocket"],
    reconnectionAttempts: 10,
});

export default socket;
