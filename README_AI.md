# AI Provider Configuration (Gemini / Generative Language)

This project is configured to call a generative AI provider from the server so API keys are never exposed to the browser.

Follow these steps to configure the AI provider locally and in production.

1) Preferred: Use Google Generative Language / Gemini

- Obtain a server-side API key from Google Cloud (a service account or API key). Enable the Generative Language API and billing on your project.
- Set the following environment variables on your server (do NOT prefix these with `VITE_`):
  - `GEMINI_API_KEY` — the server API key (kept secret)
  - `GEMINI_API_URL` — optional: override the default endpoint if you have a custom URL

2) Alternatives: Using an OpenAI key

- If you prefer OpenAI, this codebase currently expects Google-style requests. You can either:
  - Update `server/routes.ts` to call the OpenAI endpoint / OpenAI SDK instead, or
  - Set `GEMINI_API_URL` to point to a compatible proxy that accepts your OpenAI key.

3) Quick local validation

- Start the server in development and call the validate endpoint:

  GET /api/ai/validate

  This route is only enabled in non-production environments and will perform a tiny, low-cost request to the provider to confirm the key and API access are working.

4) Helpful checks built into the server

- The server detects common mistakes such as accidentally placing an OpenAI-style key that starts with `sk_` into `GEMINI_API_KEY` and returns a helpful error explaining the mismatch.
- There's a `/api/health` endpoint that reports whether the server sees AI/news keys configured (it does not return secret values).

5) Security notes

- Never add secrets to client-side environment variables that begin with `VITE_`. These are bundled and exposed to the browser.
- Use secret managers (Google Secret Manager, AWS Secrets Manager, Vercel/Netlify environment variables) for production secrets.
- Replace the in-memory rate limiter used here with a central store (Redis) if you deploy multiple instances.

6) Deploying

- Build the client (`cd client && pnpm build`) before serving `dist/public` from the server.
- For Vercel or similar platforms, ensure your build step produces files in `dist/public` and that your server has access to the `GEMINI_API_KEY` env var.

If you want, I can add an example `README_DEPLOY.md` showing exact Vercel settings for this repository layout.
