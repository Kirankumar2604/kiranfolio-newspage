Security notes for API keys and AI usage

- Move any private API keys (e.g., Gemini / generative language API keys) to server-side environment variables.
  - Set `GEMINI_API_KEY` in the server environment (process env) and do NOT expose the key to the client.
  - The project provides a server-side proxy endpoint at `POST /api/ai` that forwards AI queries to the provider.

- Do NOT add secrets to client-side environment variables (Vite `VITE_*`) unless they are intentionally public.

- .env is listed in .gitignore. Use .env.example to show required variables without secrets.

- The server-side AI endpoint enforces:
  - Input length limits
  - Per-IP rate limiting (configurable via `AI_MAX_REQ_PER_MIN`)
  - Basic validation and sanitized responses

- If you deploy, configure secrets in your hosting platform (e.g., Vercel/Cloud Run) using the platform's secret management.
