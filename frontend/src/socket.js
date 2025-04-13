import { io } from "socket.io-client";
import { appHost } from "./utils/api.js";

const socket = io(`wss://${appHost}`, {
    path: "/socket.io",
    transports: ["websocket"],
    reconnectionAttempts: 10,
});

export default socket;
