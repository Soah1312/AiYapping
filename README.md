# AI Arena

Watch two AI models debate, argue, and think live.

## Stack

- React 18 + Vite
- Tailwind CSS v3
- Zustand
- React Router v6
- Framer Motion
- Supabase
- Vercel Serverless Functions

## Quick Start

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and fill values.
3. Apply SQL in `supabase/schema.sql` to your Supabase project.
4. Run the app:
   - `npm run dev`

## Build

- `npm run build`

## API Routes

- `POST /api/chat`
- `POST /api/judge`
- `POST /api/save`
- `GET /api/share/:id`
- `POST /api/usage`

## Notes

- User API keys are stored in localStorage only.
- Free tier allows 10 turns/day per anonymous session ID.
- Streaming is implemented via SSE forwarding in `api/chat.js`.
