# VoiceDiary Backend

Node + Express + MongoDB backend for the VoiceDiary mobile app.

- **Auth** — email/password with bcrypt + JWT (access + refresh)
- **Entries** — full CRUD, cursor pagination, search, retranscribe
- **Audio storage** — Cloudinary (resource_type: video)
- **Transcription** — OpenAI Whisper primary, Google Gemini fallback on **any** error
- **Export** — single + bulk, PDF (PDFKit) / Markdown / plain text

---

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node 18+ (ESM) |
| Web framework | Express 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | bcryptjs + jsonwebtoken |
| Audio storage | Cloudinary |
| Whisper (primary) | Any OpenAI-compatible API — OpenAI `whisper-1` by default, Groq / Together / DeepInfra via `OPENAI_BASE_URL` |
| Gemini (fallback) | Google `gemini-2.0-flash` (generativelanguage API) |
| File uploads | multer (memory storage) |
| PDF | pdfkit |
| Validation | zod (available, controllers do basic checks) |

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# Fill in: MONGODB_URI, JWT_SECRET, CLOUDINARY_*, OPENAI_API_KEY, GEMINI_API_KEY

# 3. Start Mongo (local or Atlas)
#    local:  brew services start mongodb-community
#    atlas:  paste your srv URI into MONGODB_URI

# 4. Run the server
npm run dev
#  -> http://localhost:4000/api/health
```

---

## API surface

All routes are prefixed with `/api`.

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/register` | – | `{ email, password, displayName }` |
| POST | `/auth/login` | – | `{ email, password }` |
| POST | `/auth/logout` | Bearer | – |
| POST | `/auth/refresh` | – | `{ refreshToken }` or `Authorization: Bearer <refresh>` |
| GET | `/auth/me` | Bearer | – |

Returns `{ user, accessToken, refreshToken }` on register/login.

### Entries
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/entries` | Bearer | Query: `?cursor=&limit=&fromDate=&toDate=&tags=tag1,tag2` |
| GET | `/entries/search` | Bearer | Query: `?q=term&tags=tag1,tag2` |
| GET | `/entries/:id` | Bearer | – |
| POST | `/entries` | Bearer | multipart/form-data: `audio` (file), `duration` (s), `mood?`, `tags?` |
| PATCH | `/entries/:id` | Bearer | `{ tags?, mood? }` |
| DELETE | `/entries/:id` | Bearer | Also deletes the Cloudinary asset |
| POST | `/entries/:id/retranscribe` | Bearer | Re-runs Whisper→Gemini on existing audio |
| GET | `/entries/:id/transcribe-status` | Bearer | Lightweight polling endpoint |

### Export
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/export/entry/:id/:format` | Bearer | `format` ∈ `pdf` \| `md` \| `txt` |
| GET | `/export/bulk/:format` | Bearer | Query: `?fromDate=&toDate=` |

### Health
| GET | `/health` | – | `{ ok: true, ts }` |

---

## Transcription flow

```
create entry
  └─> upload audio to Cloudinary
  └─> persist Entry with transcriptionStatus: "pending", safetyNotice: null
  └─> (async, non-blocking) runTranscription()
        ├─ try: Whisper API (whisper-1, verbose_json w/ word timestamps)
        │       → on success: persist transcript + provider="whisper"
        │         + safetyNotice=null (verbatim, no filtering)
        ├─ on ANY error (4xx, 5xx, timeout, network, parse):
        │   └─ try: Gemini API (gemini-2.0-flash, inline base64 audio)
        │       ├─ on success: persist transcript + provider="gemini"
        │       │   + safetyNotice="<disclosure: Gemini's safety filter was active>"
        │       │   (Gemini has no word timestamps; we synthesize even ones)
        │       └─ on Gemini failure:
        │           └─ persist transcriptionStatus="failed", transcriptionError
        └─ on total failure:
            └─ entry stays as "failed" — user can hit Retry to re-run
```

The mobile app polls `/entries/:id/transcribe-status` every ~3s while status
is `pending` or `processing`, then refetches the full entry when `done`.

---

## Error envelope

All errors return a consistent shape:

```json
{
  "error": {
    "message": "Invalid email or password",
    "code": "auth_required",
    "status": 401
  }
}
```

Common codes: `auth_required`, `not_found`, `bad_request`, `email_taken`,
`audio_too_large`, `transcription_failed`, `route_not_found`, `rate_limited`.

---

## Smoke test

With the server running:

```bash
node scripts/smoke-test.js
```

This exercises: register → login → me → create entry (with a tiny wav) →
poll status → list → search → export → delete → logout.

It requires the same `.env` to be present (the script reads it via dotenv).

---

## Deployment

The server is a single Node process — deploy anywhere that runs Node:

- **Render / Railway / Fly.io**: push the repo, set env vars, expose port
- **VPS (PM2)**: `npm i -g pm2 && pm2 start src/server.js --name vd-api`
- **Docker**: a minimal Dockerfile is included below (not in repo by default)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]
```

Set `CORS_ORIGIN` to your production frontend URL (e.g. your Expo web
deployment or the bundle ID of your mobile app).

---

## Notes & limitations

- **Audio size cap is 25MB.** Both Whisper and Gemini reject audio larger
  than this, so accepting anything bigger would just guarantee a `failed`
  entry. Tunable via `MAX_AUDIO_BYTES` but don't exceed 25MB unless you
  also wire up audio chunking.
- **Whisper `verbose_json` + word timestamps** requires passing
  `timestamp_granularities[]=word` (the API quirk noted in the code).
- **Gemini inline audio** caps at ~25MB. Whisper accepts up to 25MB too.
  If you need bigger files, store on Cloudinary and stream-convert.
- **Safety filter disclosure.** We add zero filtering on our side. When
  Whisper succeeds, the transcript is verbatim. When Whisper fails and we
  fall back to Gemini, Gemini's own built-in safety filter is on (we
  can't disable it) — the entry is persisted with a `safetyNotice` string
  that the client surfaces to the user ("Whisper was unavailable, so this
  transcript was produced by Gemini which applies its own safety filter…").
  The original audio is always stored unmodified on Cloudinary.
- **Gemini has no native word timestamps** — when Gemini is used, we
  synthesize evenly-spaced timestamps from the entry duration so the
  karaoke-style UI highlight still works (just not synced to real speech).
- **JWT revocation** is not implemented (stateless). For real revocation
  add a Redis blacklist on logout.
- **Transcription runs in-process.** For high throughput, move it to a
  background queue (BullMQ + Redis) and have the API just enqueue.

---

## Swapping the primary transcriber (OpenAI ↔ Groq ↔ others)

The "Whisper" tier is just whichever OpenAI-compatible audio transcription
API you point `OPENAI_BASE_URL` at. The request/response shape is identical
across OpenAI, Groq, Together, DeepInfra, etc., so swapping providers is a
pure `.env` change — no code edits, no redeploy of the frontend.

**Default (OpenAI):**
```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_WHISPER_MODEL=whisper-1
```

**Groq:**
```env
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_WHISPER_MODEL=whisper-large-v3
# alternatives: whisper-large-v3-turbo, distil-whisper-large-v3-en
```

Restart the server after changing `.env`. On boot the sanity log prints
`whisperBaseUrl` so you can confirm the swap took effect:

```
[env] loaded config: { whisperBaseUrl: 'https://api.groq.com/openai/v1', whisperModel: 'whisper-large-v3', ... }
```

The Gemini fallback path is unaffected — it still fires on any primary
error, and `safetyNotice` is still surfaced to the user when it does.
