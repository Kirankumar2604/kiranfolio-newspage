import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { newsResponseSchema, categoryConfig, type TechCategory } from "@shared/schema";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(category: string, query: string): string {
  return `${category}:${query}`;
}

function getCachedData(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const NEWS_API_BASE_URL = process.env.NEWS_API_BASE_URL || "https://newsapi.org/v2";

  if (!NEWS_API_KEY) {
    console.warn("NEWS_API_KEY is not set. News API will not work.");
  }

  // Development health endpoint. Returns non-sensitive server status so you
  // can quickly confirm which process is serving and whether keys are present.
  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_URL || process.env.VITE_GEMINI_API_KEY);
    const newsConfigured = Boolean(process.env.NEWS_API_KEY);

    return res.json({
      status: 'ok',
      pid: process.pid,
      env: process.env.NODE_ENV || 'production',
      uptimeSeconds: Math.floor(process.uptime()),
      geminiConfigured,
      newsConfigured,
    });
  });

  app.get("/api/news", async (req, res) => {
    try {
      const category = (req.query.category as TechCategory) || "all";
      const searchQuery = (req.query.q as string) || "";
      
      const cacheKey = getCacheKey(category, searchQuery);
      const cachedData = getCachedData(cacheKey);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      let query = "";
      
      if (searchQuery) {
        query = searchQuery;
      } else if (category && categoryConfig[category]) {
        query = categoryConfig[category].query;
      } else {
        query = categoryConfig.all.query;
      }

      const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, {
        params: {
          q: query,
          apiKey: NEWS_API_KEY,
          language: "en",
          sortBy: "publishedAt",
          pageSize: 30,
        },
        timeout: 10000,
      });

      const validatedData = newsResponseSchema.parse(response.data);
      
      const result = {
        ...validatedData,
        articles: validatedData.articles.filter(
          (article) => 
            article.title && 
            article.title !== "[Removed]" &&
            article.description &&
            article.url
        ),
      };

      setCachedData(cacheKey, result);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching news:", error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          return res.status(429).json({ 
            error: "Rate limit exceeded. Please try again later." 
          });
        }
        if (error.response?.status === 401) {
          return res.status(401).json({ 
            error: "Invalid API key" 
          });
        }
      }
      
      res.status(500).json({ 
        error: "Failed to fetch news articles" 
      });
    }
  });

  // Simple in-memory rate limiter for the AI endpoint (per-IP)
  const aiRateLimitMap = new Map<string, { timestamps: number[] }>();
  const AI_WINDOW_MS = 60 * 1000; // 1 minute window
  const AI_MAX_REQUESTS_PER_WINDOW = parseInt(process.env.AI_MAX_REQ_PER_MIN || '20', 10);

  // AI proxy endpoint - securely forwards requests to the generative API using server-side key
  app.post('/api/ai', async (req, res) => {
    try {
      const remoteIp = (req.ip || (req.headers['x-forwarded-for'] as string) || '').toString();

      // Basic rate limiting per IP
      const entry = aiRateLimitMap.get(remoteIp) || { timestamps: [] };
      const now = Date.now();
      // prune old timestamps
      entry.timestamps = entry.timestamps.filter((t) => now - t < AI_WINDOW_MS);
      if (entry.timestamps.length >= AI_MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Rate limit exceeded for AI requests. Please try again later.' });
      }
      entry.timestamps.push(now);
      aiRateLimitMap.set(remoteIp, entry);

      const question = (req.body?.question || '').toString().trim();
      if (!question) return res.status(400).json({ error: 'Missing question in request body' });

      // simple input size limit
      if (question.length > 1000) {
        return res.status(400).json({ error: 'Question too long' });
      }

      // Prefer server-side GEMINI_API_KEY. If developers accidentally placed the
      // key in a Vite-style env var (VITE_GEMINI_API_KEY) while running locally,
      // allow it as a fallback but log a strong warning so they move it to the
      // server env (GEMINI_API_KEY) for security.
      let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const VITE_GEMINI_FALLBACK = process.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY && VITE_GEMINI_FALLBACK) {
        console.warn(
          'Found VITE_GEMINI_API_KEY in environment. For security, move this key to GEMINI_API_KEY in the server environment (do NOT expose keys to the client via VITE_ vars).'
        );
        GEMINI_API_KEY = VITE_GEMINI_FALLBACK;
      }

      const GEMINI_API_URL = process.env.GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

      if (!GEMINI_API_KEY && !process.env.GEMINI_API_URL) {
        const guidance = 'AI service not configured. Set GEMINI_API_KEY in the server environment or provide GEMINI_API_URL. See .env.example for details.';
        console.warn(guidance);
        return res.status(500).json({ error: guidance });
      }

      // Add context to narrow responses to tech news
      const contextualPrompt = `You are a tech news assistant. Only answer questions related to technology, news, tech companies, innovations, or current events. ` +
        `If the question is not related to news or technology, politely respond: "I'm a tech news assistant. I can only help with technology and news-related questions. Please ask something about tech news, companies, or innovations."\n\nUser question: ${question}`;

      const body = {
        contents: [
          {
            parts: [
              {
                text: contextualPrompt,
              },
            ],
          },
        ],
      };

      const response = await axios.post(GEMINI_API_URL, body, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });

      const data = response.data;
      // safely extract answer
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) {
        console.error('Unexpected AI response format', { got: Object.keys(data || {}) });
        return res.status(502).json({ error: "Invalid response from AI provider" });
      }

      // Return only the generated answer
      return res.json({ answer });
    } catch (err) {
      // Improved logging: capture axios response body + status to aid debugging
      if (axios.isAxiosError(err)) {
        console.error('AI proxy axios error:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });

        if (err.response?.status === 429) {
          return res.status(429).json({ error: 'AI provider rate limit exceeded. Try again later.' });
        }
        if (err.response?.status === 401 || err.response?.status === 403) {
          return res.status(502).json({ error: 'AI provider authentication failed' });
        }
      } else {
        console.error('AI proxy error', err?.toString ? err.toString() : err);
      }

      // Return a generic error to clients, but include sanitized debug info
      // when DEBUG_AI=1 is set (development only) to help debugging.
      const clientResponse: Record<string, any> = { error: 'Failed to contact AI provider' };
      try {
        if (process.env.DEBUG_AI === '1' && axios.isAxiosError(err)) {
          const providerStatus = err.response?.status;
          let providerData: any = err.response?.data;

          // Sanitize providerData by redacting likely API key fields and key query params
          try {
            const raw = JSON.stringify(providerData);
            const redacted = raw
              .replace(/(\"?(?:api_key|apiKey|key|token|access_token)\"?\s*[:=]\s*\")([^\"]+)(\")/gi, '$1[REDACTED]$3')
              .replace(/key=[^&\s\"]+/gi, 'key=[REDACTED]');
            try {
              providerData = JSON.parse(redacted);
            } catch (_e) {
              providerData = redacted;
            }
          } catch (_e) {
            providerData = providerData;
          }

          clientResponse.debug = { providerStatus, providerData };
        }
      } catch (_e) {
        // swallow any debug construction errors
      }

      return res.status(500).json(clientResponse);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
