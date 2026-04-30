# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto Reader is an AI-powered article-to-audio application. Users paste text articles, MiMo AI analyzes them to identify characters/narration, assigns voices per character, generates TTS audio for each segment, and merges them into downloadable WAV files.

## Commands

```bash
npm run dev          # Local development (http://localhost:3000)
npm run build        # Production build
npm run deploy       # Build + deploy to Cloudflare Workers
npm run preview      # Build + preview on Cloudflare Workers locally
npm run lint         # ESLint check
```

## Architecture

### Dual-Mode System
- **Local mode** (default): API key in localStorage, no DB, no auth, no history persistence
- **Server mode** (`NEXT_PUBLIC_SERVER_MODE=true`): D1/R2 storage, Google OAuth, rate limiting, history

### Core Data Flow
1. User pastes article → `POST /api/analyze` → MiMo chat API identifies characters, splits into narration/dialogue segments, designs voice descriptions
2. Segments displayed as cards → "Generate All" → TTS for each segment
3. First segment per character uses `mimo-v2.5-tts-voicedesign` (voice from text description)
4. Subsequent segments use `mimo-v2.5-tts-voiceclone` with first segment's audio as reference
5. Personal mode: all segments use voiceclone with user's recorded/uploaded voice
6. Long text (>2500 chars) auto-splits at sentence boundaries, each chunk TTS'd separately, WAV chunks merged

### Key Libraries
- `lib/db.ts` — D1/local SQLite dual-mode (wraps better-sqlite3 in D1-compatible async interface)
- `lib/storage.ts` — R2/local filesystem dual-mode for audio files
- `lib/mimo-client.ts` — MiMo API with retry (3 attempts, exponential backoff)
- `lib/audio-merger.ts` — Pure JS WAV PCM concatenation (no external deps)
- `lib/config.ts` — Config resolution: server env vars > client localStorage
- `lib/auth.ts` — Google OAuth exchange, cookie-based sessions
- `lib/rate-limit.ts` — 5/day for anonymous (by IP), unlimited for logged-in users

### Database Schema (D1/SQLite)
- `users` — Google OAuth users
- `analysis_records` — Analysis summaries (no article content)
- `article_contents` — Full article text (separate for size)
- `audio_segments` — Segment metadata + audio file keys
- `usage_records` — Rate limiting tracking

### Frontend
- Next.js 16 App Router with React 19
- Tailwind CSS v4 (dark/light/system theme via ThemeProvider context)
- i18n: zh/en via simple key-value system in `lib/i18n.ts`
- Settings stored in localStorage (client) or env vars (server)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MIMO_API_KEY` | Yes | Xiaomi MiMo API key |
| `MIMO_BASE_URL` | No | API base URL (default: https://api.xiaomimimo.com/v1) |
| `NEXT_PUBLIC_SERVER_MODE` | No | Set `"true"` to enable D1/R2/auth |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For auth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For auth | Google OAuth secret (server-only) |

## Deployment

Cloudflare Workers via OpenNext adapter. `wrangler.jsonc` defines D1 (`DB`) and R2 (`AUDIO_BUCKET`) bindings. GitHub Actions workflow deploys on push to main. API keys set via `wrangler secret put`.

## Key Conventions

- API routes use `Promise<{ id: string }>` for dynamic params (Next.js 16 pattern)
- D1 queries use `prepare().bind().first()/.all()/.run()` pattern (no multi-statement exec)
- Audio files stored as WAV in R2/local: `audio/{userId}/{analysisId}/segment_{index}.wav`
- TTS retries on 5xx/network errors with exponential backoff
- Analysis saved to DB on analyze; audio saved to R2 on generation; merged audio saved on download
