# Language Exchange App — Build Plan

A mobile app where two people who each speak the language the other is learning chat by text and
talk by voice, teaching each other. Example: a Finnish speaker learning Spanish paired with a
Spanish speaker learning Finnish.

This file is the source of truth for the project. Claude Code: read this before starting any phase.

**Builder context:** solo, beginner (has only coded with Claude), Mac + iPhone, no Android device,
Claude Pro plan. Explain steps briefly, say exactly what must be done by hand, verify your own work.

---

## 1. Decisions (locked for v1)

| Area | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + TypeScript** | One codebase for iOS + Android. |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions, Storage) | Accounts, database, live chat out of the box. Open source, free tier. |
| Voice calls | **LiveKit** (open source WebRTC). LiveKit Cloud free tier first; self-host later if needed. | Handles the hard networking. Media encrypted in transit by default. |
| Push notifications | **Expo Notifications** | One API for both platforms. |
| Navigation | Expo Router | Default for new Expo apps. |

**Platform order: iOS first.** We only have an iPhone, so we build, test and launch on iOS.
The code stays cross-platform; Android comes after iOS has real users (Android emulator for
testing, and Google's required closed test needs real testers we don't have yet).

**Scope rules**
- Voice only. No video — less moderation risk, less bandwidth, less cost.
- 18+ only. Age confirmation at signup.
- Email sign-in only for v1. (Adding Google login forces adding Apple login on iOS — later.)
- No profile photos in v1: users pick an avatar colour. Less moderation risk.
- Banned-word filter on messages, names and bios (`banned_words` table, editable in the dashboard).
- No end-to-end encryption in v1. TLS in transit + Supabase encryption at rest. We must be able to
  review reported messages.
- Calls ring in-app only in v1 (both have the app open, or they agree a time in chat). Native
  phone-style ringing (CallKit) is a later upgrade — it is fiddly.
- App UI in English for v1, but all UI text goes through one strings file so translating later is easy.

**Languages**
- Supported at launch: English, Finnish, Spanish, French, German, Italian, Portuguese, Swedish.
  Adding a language = adding one row; the data model doesn't care.
- The app supports all of them, but **marketing focuses on one wedge: Finnish.** Big apps serve
  Finnish learners badly, the learners are concentrated and easy to find, and Finnish speakers
  want practice in all the other supported languages. Spreading thin across 8 languages with no
  community means nobody finds a partner.
- Matching uses "speaks fluently", not strictly "native" — many Finnish learners' native language
  isn't on the list, but they can offer fluent English.

**Non-goals for v1:** video, group rooms, AI tutor features, payments, web version, streaks, Android release.

---

## 2. Setup checklist (Mac)

### Install on the Mac
1. **Xcode** — Mac App Store (big download, start it first). Open it once and accept the licence;
   install the iOS Simulator when asked. This also gives you Git.
2. **Node.js LTS** — nodejs.org
3. **Claude Code** — in Terminal: `curl -fsSL https://claude.ai/install.sh | bash`
   - Check with `claude --version`, then run `claude` and log in with the Claude Pro account.
   - Do NOT set an `ANTHROPIC_API_KEY` environment variable — that switches billing to paid API usage.
4. **VS Code** (optional, recommended) — to look at files; has a Claude Code extension.
5. Later, for Android only: Android Studio.

### Install on the iPhone
- **Expo Go** — runs the app instantly during Phases 0–4.

### Two test users without a second phone
- User A = your iPhone. User B = the **iOS Simulator** on the Mac. Chat, push and voice can all
  be tested between them (the Simulator uses the Mac's microphone).

### Free accounts
- GitHub (code backup), Expo (expo.dev), Supabase (supabase.com), LiveKit Cloud (livekit.io)

### Paid — Apple Developer Program (yearly fee)
- Not needed for Phases 0–4.
- Phase 5 (voice) needs a development build on the iPhone. A free Apple ID works through Xcode
  ("Personal Team"), but the install expires after a week and must be rebuilt.
- **Required from Phase 6**: push notification credentials need the paid membership. Also required
  for TestFlight and the App Store. Buy it at Phase 6 at the latest, or at Phase 5 if weekly
  rebuilding gets annoying.

---

## 3. Phases

One phase = one or more Claude Code sessions. Finish, test on the phone, commit, `/clear`, next.

### Phase 0 — Hello world
- Create Expo app (TypeScript, Expo Router). Run in Expo Go on the iPhone and in the iOS Simulator.
- Git repo + push to GitHub. Create lean `CLAUDE.md`. `.env` in `.gitignore`.
- Create Supabase project; connect app with env vars (anon key only in the app).
- **Done when:** app opens on the iPhone and reads a test row from Supabase.

### Phase 1 — Accounts and profile
- Email sign-up / sign-in (Supabase Auth). 18+ confirmation. Accept Terms + Privacy Policy.
- Onboarding: display name, languages I speak fluently (mark native), languages I'm learning +
  level (beginner / intermediate / advanced), timezone, short bio, avatar colour.
- Edit profile. Delete account (App Store requires it — build it now, not later).
- **Done when:** two test accounts exist with full profiles; deletion removes all their data.

### Phase 2 — Find a partner
- Browse people who speak fluently a language I'm learning AND are learning a language I speak
  fluently. Sort by recently active. Filter by language and level.
- Profile view with "Say hi" button. No algorithm in v1.
- **Done when:** account A sees account B and not people with non-matching languages.

### Phase 3 — Text chat + safety (ship together, never chat without safety)
- 1:1 conversations, messages via Supabase Realtime, conversation list, unread counts.
- **Block** (hides both ways, stops messages) and **Report** (user or message, with reason).
- Row Level Security on every table: users can only read conversations they belong to.
- Rate limit on new conversations per day (anti-spam).
- Review reports in the Supabase dashboard at first; `is_banned` flag locks an account out.
- **Done when:** iPhone and Simulator chat live; blocking works; a report lands in the reports table.

### Phase 4 — Conversation helpers (the differentiator)
- Topic prompt cards by level ("Describe your morning routine").
- Language-switch timer: "15 min in Finnish, then 15 min in Spanish".
- Corrections: long-press a partner's message → suggest a corrected version, shown inline.
- **Done when:** all three work inside a chat.

### Phase 5 — Voice calls
- Switch from Expo Go to a **development build** (`expo-dev-client`), built locally with Xcode
  onto the iPhone and the Simulator. From here on Expo Go no longer works (LiveKit needs native code).
- Add LiveKit React Native SDK + Expo config plugins; microphone permission text.
- Supabase Edge Function mints short-lived LiveKit room tokens. **LiveKit API secret lives only
  in the Edge Function, never in the app.**
- Call flow: tap Call in a chat → `call_sessions` row → in-app ring via Realtime → both join an
  audio-only room. Mute, speaker toggle, hang up, call timer, language-switch timer from Phase 4.
- Only users with an existing conversation (and no block) can call each other.
- Report during/after call. Calls are NOT recorded.
- **Done when:** iPhone on mobile data and Simulator on Wi-Fi hold a 10-minute call.

### Phase 6 — Push notifications (buy Apple Developer membership here)
- Expo push tokens stored per device. Edge Function sends push on new message and incoming call.
- Mute per conversation. Nothing from blocked users.
- **Done when:** the iPhone buzzes when the Simulator user writes and the app is closed.

### Phase 7 — App Store readiness
- Privacy Policy + Terms (hosted URL). GDPR: deletion, data export on request, minimal data.
- Listing: icon, screenshots, description, age rating, App Privacy form.
- Written moderation process (who reviews reports, how fast, what gets a ban) — Apple asks about
  this for apps with user-generated content.
- Supabase: turn "Confirm email" back ON (switched off during development), replace the draft
  Terms/Privacy text in `src/constants/legal.ts` with the reviewed versions.
- Crash reporting (Sentry or similar). Production build with EAS → TestFlight → App Review.
- **Done when:** Apple approves.

### Phase 8 — Launch
- Open TestFlight to the waitlist first (see section 4), fix what breaks, then go public.
- Watch: signups per language, % who send a first message, % who get a reply, reports.

### Later
- Android release, native call ringing (CallKit), translated UI, more languages, Apple/Google sign-in.

---

## 4. Parallel track — find the first users (no code, start during Phase 2–3)

There is no community yet, and an empty exchange app is useless, so this matters as much as the code.
- Put up a one-page waitlist (name, email, speaks, learning). Goal: 100 signups before Phase 8,
  with at least 30 on each side of Finnish.
- Where Finnish learners are: r/LearnFinnish, Finnish-learning Discord servers, Facebook groups for
  foreigners in Finland, university international offices and ESN sections, integration-course
  and adult-education Finnish teachers.
- Where Finnish speakers learning other languages are: university language centres, language
  subreddits, student associations.
- Ask, don't advertise: "I'm building this, what's missing from Tandem/HelloTalk for you?"
  The answers should shape Phase 4.
- If the waitlist stays near zero after honest effort, that is a signal to rethink before paying
  for anything.

---

## 5. Data model (starting sketch)

- `profiles` — id (= auth user), display_name, bio, avatar_color, timezone, last_active_at, is_banned
- `languages` — code, name (seeded with the 8 launch languages)
- `user_languages` — user_id, language_code, kind (`native` | `fluent` | `learning`), level (`beginner` | `intermediate` | `advanced`, learning only)
- `conversations` — id, user_a, user_b, created_at, last_message_at
- `messages` — id, conversation_id, sender_id, body, corrected_from_message_id, created_at
- `blocks` — blocker_id, blocked_id
- `reports` — id, reporter_id, reported_user_id, message_id?, call_session_id?, reason, status
- `call_sessions` — id, conversation_id, started_by, started_at, ended_at, livekit_room
- `push_tokens` — user_id, expo_token, platform

Every table has Row Level Security enabled. Default deny.

---

## 6. Working with Claude Code on the Pro plan

**Model choice**
- Pro usage = a 5-hour session limit + a weekly limit, **shared between the Claude chat app and
  Claude Code**. Long planning chats in the app eat the same budget as coding.
- **Fable models are not part of Pro's included usage** — on Pro they bill as pay-as-you-go usage
  credits. Don't select Fable in Claude Code unless you want to pay extra.
- Default to **Sonnet**. Use **Opus** only for planning a phase or a bug Sonnet failed on twice.
  **Haiku** for trivial edits. `/model` shows what your account has; `/model opusplan` = Opus
  plans, Sonnet executes.
- `/status` shows remaining usage. If offered API credits at the limit, decline to stay inside
  the subscription.

**Habits that save the most usage**
1. `/clear` every time you start a new task. Biggest single saver.
2. `/compact` if you must keep going in a long session.
3. Plan Mode (Shift+Tab) before anything touching more than 2–3 files. Fix the plan, then execute.
4. Refer to files by path ("look at `app/chat/[id].tsx`") instead of pasting code.
5. Keep `CLAUDE.md` short (under ~200 lines). It is sent with every message.
6. One phase at a time, small tasks inside it. Commit after each working step.
7. When something breaks, paste only the relevant 20–30 lines of the error.

**Beginner rules**
- Never paste secret keys into a chat or commit them. Secrets go in `.env` (app) or Supabase
  secrets (Edge Functions).
- Commit after every step that works, so there is always a good version to go back to.
- If Claude Code fails at the same thing three times: stop, `/clear`, describe the problem fresh,
  and switch to Opus for that one problem.
- Ask "explain what you just did in 5 lines" after each step. Understanding the app a little
  makes every later prompt cheaper.

---

## 7. First prompt for Claude Code

Put this file in an empty project folder, open Terminal there, run `claude`, and paste:

```
Read PLAN.md. We are starting Phase 0 only. I am a beginner on a Mac with an iPhone, so explain
each step briefly and tell me exactly what I need to do by hand (accounts, keys, phone). First
check that Xcode, Node and Git are installed. Then propose a plan for Phase 0 and wait for my OK
before changing anything. Also create a lean CLAUDE.md (under 60 lines) with the stack, scope
rules, and commands from PLAN.md.
```
