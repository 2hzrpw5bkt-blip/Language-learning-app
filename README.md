# Language Exchange

A mobile app where two people who each speak the language the other is learning chat by text
(and, later, by voice) and teach each other. Finnish is the launch focus. See `PLAN.md` for the
full plan and phase status, and `CLAUDE.md` for working rules.

## Stack

- Expo SDK 57 (React Native, TypeScript, Expo Router). App code in `src/`, screens in `src/app/`.
- Supabase (Postgres, Auth, Realtime). Schema lives in `supabase/migrations/`, applied in order.
- LiveKit for voice calls (Phase 5, not yet built).

## Run it

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase project URL and publishable key.
3. Apply every file in `supabase/migrations/` in order through the Supabase SQL editor (each file is safe to run twice).
4. `npx expo start`, then scan the QR code with Expo Go on an iPhone, or press `i` for the iOS Simulator.

Checks: `npm run typecheck`, `npx expo lint`, `npm test`.

## What works today

Accounts and onboarding, partner matching, live text chat with block and report, topic cards,
a shared language-switch timer, inline corrections, a banned-word filter, and account deletion.
