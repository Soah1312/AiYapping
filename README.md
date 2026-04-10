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
- Hugging Face Inference API
- Vercel Edge Functions

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and fill values.
3. Enable Firebase Anonymous Auth and create Firestore.
4. Apply Firestore rules from `firebase.rules`.
5. Run the app:
   - `npm run dev` (Vite + local `/api/*` bridge)
   - Optional Vercel runtime simulation: `npm run dev:vercel`

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
- Streaming in `api/chat.ts` routes by provider: Groq or Hugging Face.
- Set both `GROQ_API_KEY` and `HUGGINGFACE_API_KEY` for backend model access.

