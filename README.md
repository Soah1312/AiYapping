# AI Arena

Watch two AI models debate, argue, and think live.

## Stack

- React 18 + Vite
- Tailwind CSS v3
- Zustand
- React Router v6
- Framer Motion
- Firebase (Firestore + Anonymous Auth)
- Groq via Vercel AI SDK
- Vercel Edge Functions

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and fill values.
3. Enable Firebase Anonymous Auth and create Firestore.
4. Apply Firestore rules from `firebase.rules`.
5. Run the app:
   - `npm run dev:vercel` (required for local `/api/*` routes)
   - Optional UI-only mode without API routes: `npm run dev`

## Environment Keys

- `GROQ_KEY_1`, `GROQ_KEY_2`, ...: Groq key pool (all `GROQ_KEY_*` are auto-discovered and rotated per request)
- `GROQ_API_KEY`: optional backward-compatible fallback if no `GROQ_KEY_*` keys are set
- `HUGGINGFACE_KEY_1`, `HUGGINGFACE_KEY_2`, ...: Hugging Face key pool (all `HUGGINGFACE_KEY_*` are auto-discovered and rotated per request)
- `HUGGINGFACE_API_KEY`: optional backward-compatible fallback if no `HUGGINGFACE_KEY_*` keys are set
- `NVIDIA_KEY_1`, `NVIDIA_KEY_2`, ...: NVIDIA key pool (all `NVIDIA_KEY_*` are auto-discovered and rotated per request)
- `NVIDIA_API_KEY`: optional backward-compatible fallback if no `NVIDIA_KEY_*` keys are set
- `VITE_FIREBASE_CONFIG`: Firebase client config JSON (frontend + API usage tracking)

## Build

- `npm run build`

## API Routes

- `POST /api/chat`
- `POST /api/judge`
- `POST /api/save`
- `GET /api/share?id=:shareId`
- `POST /api/usage`

## Notes

- Session identity comes from Firebase Anonymous Auth UID.
- Free tier allows 10 turns/day per anonymous UID.
- Streaming uses Vercel AI SDK `streamText(...).toDataStreamResponse()` in `api/chat.ts`.
