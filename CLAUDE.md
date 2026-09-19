# Language Exchange App

1:1 language exchange: text chat + voice calls between people learning each other's language.
Full plan, phases and data model: `PLAN.md` (source of truth — read it before starting a phase).

## Builder
Solo beginner on Mac + iPhone, Claude Pro. Explain steps briefly, say exactly what to do by hand,
verify your own work, commit after every working step. Never paste or commit secrets.

## Stack (locked for v1)
- Expo SDK 57 (React Native) + TypeScript, Expo Router. Expo changes fast: check
  https://docs.expo.dev/versions/v57.0.0/ before writing Expo code. App code lives in `src/`,
  screens in `src/app/`, `@/` maps to `src/`.
- Supabase: Postgres, Auth, Realtime, Edge Functions, Storage. RLS on every table, default deny.
- Voice messages: `expo-audio` recordings in a private Supabase Storage bucket. No live calls in v1.
- Expo Notifications for push

## Scope rules
- iOS first. Code stays cross-platform; Android release later.
- Voice messages, no live calls, no video. 18+ only. Email sign-in only.
- No E2E encryption (must be able to review reported messages).
- UI in English; all UI strings live in one strings file.
- Chat never ships without block + report + RLS.
- Non-goals v1: video, groups, AI tutor, payments, web, streaks, Android.

## Database changes
- Write SQL as `supabase/migrations/NNNN_name.sql`, idempotent (drop-if-exists / if-not-exists).
- The builder pastes it into Supabase > SQL Editor and runs it. No Supabase CLI yet.
- `src/lib/profile.ts` holds all profile/language queries; screens never call Supabase tables directly.

## Secrets
- App reads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`.
- `.env` is gitignored. The service-role key lives only in Supabase secrets, never in the app.

## Commands
- `npx expo start` — dev server (scan QR with Expo Go on iPhone; press `i` for Simulator)
- `npx expo start --tunnel` — if phone and Mac are on different networks
- `npm run typecheck` — type check
- `npx expo lint` — lint
- Phase 6+: `npx expo run:ios` (development build, Expo Go no longer works)

## Working style
- One phase per session. Plan Mode before touching more than 2–3 files.
- Small tasks, small commits. `/clear` between tasks.
