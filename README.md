# Auto Reader

AI-powered article analysis and voice reading with MiMo. Automatically identifies characters and narration in articles, generates appropriate voices, and creates audio readings.

**Demo**: https://auto-reader.sparkles-editor.com/

## Features

- **AI Smart Mode**: Automatically assigns different voices to different characters
- **Personal Reading Mode**: Use your own voice via voice cloning
- **Multi-language Support**: Chinese and English interface
- **Dark/Light Theme**: System-aware theme switching
- **Voice Design**: Generate custom voices from text descriptions
- **Voice Clone**: Clone voices from audio samples
- **Long Text Support**: Automatic text splitting for articles over 2500 characters
- **Audio Download**: Merge and download complete audio files
- **History**: Save and download your generation history
- **Rate Limiting**: 5 free analyses per day for anonymous users, unlimited for logged-in users

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Cloudflare Workers / Node.js
- **Database**: Cloudflare D1 / SQLite (local)
- **Storage**: Cloudflare R2 / Local filesystem
- **TTS**: MiMo V2.5 TTS API
- **Auth**: Google OAuth 2.0

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Nciae-Zyh/auto-reader.git
cd auto-reader
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MiMo API Key:

```
MIMO_API_KEY=your_api_key_here
```

Get your API Key from [Xiaomi MiMo Platform](https://platform.xiaomimimo.com)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Cloudflare Workers (Recommended)

#### Prerequisites

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Create D1 Database:
```bash
wrangler d1 create auto-reader-db
```

4. Copy the `database_id` from the output and add to `wrangler.jsonc`.

5. Create R2 Bucket:
```bash
npx r2 bucket create auto-reader-audio
```

6. Update `wrangler.jsonc` with bindings:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "auto-reader-db",
      "database_id": "YOUR_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "AUDIO_BUCKET",
      "bucket_name": "auto-reader-audio"
    }
  ]
}
```

7. Deploy:
```bash
npm run deploy
```

#### GitHub Actions Auto Deploy

The workflow file `.github/workflows/deploy.yml` is already included.

**Required GitHub Secrets:**

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (create at dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `MIMO_API_KEY` | Your MiMo API key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret (optional) |

**How it works:**

1. Push to `main` branch triggers the workflow
2. Builds the Next.js app
3. Deploys to Cloudflare Workers
4. Sets secrets via `wrangler secret put`

### Local/Server Deployment

For self-hosted deployment:

1. Set environment variables:
```bash
export SERVER_MODE=true
export MIMO_API_KEY=your_api_key
export GOOGLE_CLIENT_ID=your_google_client_id  # Optional, for Google login
export GOOGLE_CLIENT_SECRET=your_google_client_secret
```

2. Build and start:
```bash
npm run build
npm start
```

The app will automatically use SQLite for database and local filesystem for storage.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MIMO_API_KEY` | Yes | Your MiMo API key |
| `MIMO_BASE_URL` | No | API base URL (default: https://api.xiaomimimo.com/v1) |
| `MIMO_TTS_MODEL` | No | Default TTS model |
| `NEXT_PUBLIC_SERVER_MODE` | No | Set to `true` to enable server mode (D1/R2/Google Auth) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For auth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For auth | Google OAuth client secret |

### TTS Models

| Model | Description |
|-------|-------------|
| `mimo-v2.5-tts-voicedesign` | Generate voices from text descriptions (Recommended) |
| `mimo-v2.5-tts` | Use built-in preset voices |
| `mimo-v2.5-tts-voiceclone` | Clone voices from audio samples |

## Project Structure

```
auto-reader/
├── app/
│   ├── api/
│   │   ├── analyze/          # Article analysis endpoint
│   │   ├── auth/             # Authentication endpoints
│   │   ├── history/          # Generation history endpoints
│   │   └── tts/              # Text-to-speech endpoint
│   ├── history/              # History page
│   ├── settings/             # Settings page
│   ├── login/                # Login page
│   ├── layout.tsx
│   └── page.tsx
├── components/               # React components
├── lib/
│   ├── auth.ts               # Authentication utilities
│   ├── db.ts                 # Database utilities (D1/SQLite)
│   ├── i18n.ts               # Internationalization
│   ├── storage.ts            # File storage (R2/local)
│   ├── mimo-client.ts        # MiMo API client with retry
│   └── types.ts              # TypeScript types
├── wrangler.jsonc            # Cloudflare Workers config
├── open-next.config.ts       # OpenNext config
└── .env.example              # Environment variables template
```

## License

MIT
