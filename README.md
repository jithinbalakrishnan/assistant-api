# assistant-api

Backend API for the AI Assistant application. Node.js + Express, no TypeScript.

## Architecture

```
Route -> Controller -> Service
```

- **Routes** (`src/routes`) define the HTTP surface only.
- **Controllers** (`src/controllers`) validate input, call services, shape HTTP responses.
- **Services** (`src/services`) contain business logic. `chatService.js` is the seam where
  a real LLM provider (OpenAI, Anthropic, Gemini, Ollama, Azure OpenAI, ...) will plug in later.
- **Middleware** (`src/middleware`) holds cross-cutting concerns: 404 handling and centralized
  error handling.
- **Config** (`src/config`) centralizes environment variable access.

This separation means swapping the hardcoded reply for a real LLM call, adding streaming,
conversation history, or authentication later only touches the service layer (and adds new
middleware/routes), not the routing or controller code.

## Requirements

- Node.js >= 18

## Setup

```bash
cd assistant-api
npm install
cp .env.example .env
npm run dev
```

The server starts on `http://localhost:4000` by default (configurable via `.env`).

## Scripts

- `npm run dev` — start the server with file watching (auto-restart on changes)
- `npm start` — start the server normally

## Environment Variables

| Variable      | Description                              | Default                 |
| ------------- | ----------------------------------------- | ------------------------ |
| `PORT`        | Port the server listens on                | `4000`                   |
| `CORS_ORIGIN` | Allowed origin for CORS (the frontend URL)| `http://localhost:5173`  |

## API

### `GET /health`

Health check. Returns `{ "status": "ok" }`.

### `POST /chat`

**Request body:**

```json
{
  "name": "John",
  "message": "Hello"
}
```

**Response body:**

```json
{
  "reply": "Hello John! Nice to meet you. How can I assist you today?"
}
```

The reply is currently hardcoded — no AI provider is integrated yet. `name` and `message`
are both required, non-empty strings; otherwise a `400` error is returned.

## Error Format

All errors (400, 404, 500) are returned as:

```json
{
  "error": {
    "message": "Description of what went wrong"
  }
}
```
