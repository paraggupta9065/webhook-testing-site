
# Test Webhook

A full-stack Webhook Testing & Tunneling application for developers. Instantly generate unique webhook URLs, view incoming requests in real-time, and forward them to your local development environment using a CLI tunnel agent. Hosted at [test-webhook.com](https://test-webhook.com).

---

## Features
- **Unique Webhook URLs:** Instantly generate a unique URL for testing webhooks.
- **Real-Time Dashboard:** View incoming webhook requests live as they arrive.
- **Request Forwarding:** Forward webhook requests to your local server using a CLI tunnel.
- **Request History:** Inspect headers, body, and method for each request.
- **Modern UI:** Built with React, Vite, and Tailwind CSS for a fast, responsive experience.

---

## Architecture
- **Monolithic Node.js/Express backend** serving a React/Vite frontend.
- **Socket.io** for real-time updates between server, dashboard, and CLI agent.
- **CLI Agent** connects to the server and forwards requests to your local port.

---

## Folder Structure
```
.
├── cli.js                # CLI tunnel agent
├── server/               # Backend (Express, Socket.io, routes, storage)
├── client/               # Frontend (React, Vite, Tailwind)
│   ├── src/
│   ├── public/
│   └── ...
├── shared/               # Shared types, routes, schema
├── package.json          # Root dependencies and scripts
├── drizzle.config.ts     # (If using Drizzle ORM)
├── ...
```

---

## Installation & Setup


### 1. Clone the repository
```sh
git clone <repo-url>
cd test-webhook.com
```

### 2. Install dependencies (root and client)
```sh
npm install
cd client && npm install
```

### 3. Development
```sh
npm run dev
```
- Starts both backend and frontend concurrently.

### 4. Production Build
```sh
npm run build
npm start
```

---

## Usage

### 1. Generate a Webhook URL
- Open the dashboard in your browser.
- On load, a unique webhook URL is generated for your session.

### 2. View Incoming Requests
- Send any HTTP request (POST, GET, etc.) to your unique webhook URL.
- Requests appear in real-time in the dashboard sidebar.
- Click a request to view headers and body.


### 3. Forward Requests to Your Server (Tunnel)
- Run the CLI agent in a separate terminal:
  ```sh
  node cli.js <UUID> <LOCAL_PORT>
  ```
- Example: `node cli.js 123e4567-e89b-12d3-a456-426614174000 3000`
- The CLI will forward incoming webhook requests to your local server (e.g., `http://localhost:3000`).

---

## Technologies Used
- **Backend:** Node.js, Express, Socket.io, ioredis, cors, dotenv
- **Frontend:** React, Vite, Tailwind CSS, framer-motion, date-fns, lucide-react, react-syntax-highlighter, clsx, tailwind-merge
- **CLI:** Node.js, socket.io-client, axios

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
[MIT](LICENSE)
