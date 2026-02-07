#!/usr/bin/env node
import { io } from "socket.io-client";
import axios from "axios";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node cli.js <WEBHOOK_ID> <LOCAL_PORT> [SERVER_URL]");
  process.exit(1);
}

const webhookId = args[0];
const localPort = args[1];
// The 3rd arg is the server URL, defaults to http://localhost:5000 for local testing.
const serverUrl = args[2] || "http://localhost:5000";

console.log(`Connecting to ${serverUrl} for webhook ${webhookId}...`);
console.log(`Forwarding to http://localhost:${localPort}`);

const socket = io(serverUrl, {
  path: "/socket.io",
});

socket.on("connect", () => {
  console.log("Connected to server!");
  socket.emit("register-tunnel", webhookId);
});

socket.on("tunnel-request", async (request) => {
  console.log(`[${request.method}] ${request.path}`);
  
  try {
    const localUrl = `http://localhost:${localPort}${request.path.replace(`/webhook/${webhookId}`, '')}`; 
    // Note: The path in request is /webhook/:id/..., we probably want to forward relative path?
    // The prompt says "forward the request". If I hit /webhook/abc/users, should it go to localhost:3000/users?
    // Usually yes.
    // The request.path stored is /webhook/:id (plus subpath if we supported wildcards, but we defined exact route /webhook/:id).
    // Express 'app.all("/webhook/:id")' only matches exact path unless we use wildcard.
    // Prompt says "Route ALL /webhook/:uuid".
    // If the user sends query params, they are in request.query.
    // Let's forward to localhost:PORT/ by default as the base.
    
    // Simplest approach: Forward the body/headers/method to localhost:PORT/
    
    await axios({
      method: request.method,
      url: `http://localhost:${localPort}/`, // Forward to root of local service
      headers: request.headers, // Careful with host headers etc
      data: request.body,
      params: request.query
    });
    
    console.log(`✓ Forwarded successfully`);
  } catch (err) {
    console.error(`✗ Forward failed: ${err.message}`);
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from server.");
});

socket.on("connect_error", (err) => {
  console.log(`Connection error: ${err.message}`);
});
