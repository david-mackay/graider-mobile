# Shipping Graider (iOS)

Checklist to go from local dev → TestFlight → App Store.

Mobile is a thin client: auth via Clerk JWT, all data/AI via `EXPO_PUBLIC_APP_URL` → Vercel API (`graider/` sibling repo).

## Pre-flight (do once)

### 1. Production backend

| Service | Action |
|---------|--------|
| **Clerk** | Production instance with `pk_live_…` in EAS env — not `pk_test_`. Google OAuth enabled. |
| **RevenueCat** | iOS app + entitlement `pro` + offering with monthly package. Webhook → `https://graider.vercel.app/api/webhooks/revenuecat`. |
| **Vercel** | `graider.vercel.app` deployed with grade-stack async job API + worker on Render. |
| **Render** | BullMQ worker running (`worker/main.ts`), Redis connected. See `graider/docs/ops/render-bullmq-grading-service.md`. |

### 2. Smoke test (real teacher account)

- [ ] Sign in with Google
- [ ] Complete onboarding funnel (pre-auth sample grade)
- [ ] Create class + test
- [ ] Stack grade 3+ real paper photos via **camera**
- [ ] Confirm matches → see results
- [ ] Subscription paywall appears at correct gate (when implemented)
- [ ] Restore purchases works (when implemented)

### 3. Legal (stores require these)

Host on `graider.vercel.app` or a static site:

| Field | URL |
|-------|-----|
| **Privacy Policy** | `https://graider.vercel.app/privacy` |
| **Support** | `https://graider.vercel.app/support` |
| **Marketing** (optional) | `https://graider.vercel.app` |

Support email: **davidmackay808@gmail.com**

---

## EAS setup

### Install & login

```bash
npm install -g eas-cli
eas login
eas init
```

`eas init` links the project on expo.dev and adds `extra.eas.projectId` to `app.json`.

### Production environment variables

Set on EAS (never commit `.env`):

```bash
eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..." --environment production --visibility plaintext

eas env:create --name EXPO_PUBLIC_APP_URL --value "https://graider.vercel.app" --environment production --visibility plaintext

eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value "appl_..." --environment production --visibility plaintext
```

On Vercel (backend), set:

- `REVENUECAT_SECRET_API_KEY` — RevenueCat secret API key (Project Settings → API keys)
- `REVENUECAT_WEBHOOK_AUTH` — random bearer token; paste same value in RevenueCat webhook Authorization header

Repeat mobile env for `preview` if you use internal builds with staging keys.

Pull locally for a production-like dev session:

```bash
eas env:pull --environment production
npx expo start -c
```

---

## Build

### iOS (TestFlight → App Store)

```bash
eas build --platform ios --profile production
```

After the build:

```bash
eas submit --platform ios --profile production --latest
```

Or upload the `.ipa` from the EAS dashboard manually.

**App Store Connect**

1. Create app with bundle id `com.davidtapestry.graider-mobile` (must match `app.json`).
2. App name: **Graider** (not "graider-mobile").
3. Screenshots: stack upload flow, graded results, onboarding hook.
4. Age rating, privacy nutrition labels, export compliance.
5. Add `ascAppId` to `eas.json` → `submit.production.ios` after creating the app.

### Android (Play Console — post-launch)

```bash
eas build --platform android --profile production
```

Package: `com.davidtapestry.graider_mobile`

### Internal test build (no store)

```bash
eas build --platform ios --profile preview
```

Share the install link from expo.dev. **Not Expo Go** — camera and native modules require a dev/preview build.

---

## Versioning

- `app.json` → `expo.version` is the user-facing version (**and** the EAS Update `runtimeVersion` via `appVersion` policy).
- `eas.json` → `production.autoIncrement` bumps **build number** per EAS build (remote).
- Bump `expo.version` for each new store submission that needs a new native binary / OTA runtime.
- Account → footer shows `version (build) · ota …` so you can confirm which binary + OTA bundle is running.

### Store update gates (`/api/app-version`)

Mobile polls `GET /api/app-version` on launch and foreground:

| Field | Meaning |
|-------|---------|
| `minVersion` | Binary below this → **force** App Store / Play update (OTA skipped) |
| `latestVersion` | Binary below this → soft “Update available” prompt (dismissible once per latest) |
| `storeUrl` | Opens the listing; set `MOBILE_IOS_STORE_URL` after App Store Connect exists |

Defaults live in `graider/lib/mobile-app-version.ts`. Override with env on Vercel without a code change.

**When you ship a breaking native build (e.g. 1.0.0 → 1.1.0):**

1. Bump `expo.version` in `app.json` / `package.json`.
2. Build + submit the new binary.
3. After it is live, set `minVersion` (or `latestVersion` for soft) to the new version so older installs are prompted.

JS-only fixes on the same `expo.version` → `pnpm run update:production` (OTA). Old binaries keep receiving OTAs until you raise `minVersion`.

---

## OTA updates (EAS Update)

OTA delivers JavaScript/asset changes without a new App Store review. It does **not** replace native builds when you add or upgrade native modules (camera, notifications, etc.).

### One-time: native build with updates enabled

After adding `expo-updates`, ship a **new** production build before relying on OTA:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

Build profiles already map to update channels:

| Profile | Channel |
|---------|---------|
| `development` | `development` |
| `preview` | `preview` |
| `production` | `production` |

### Ship a JS-only update

```bash
# From graider-mobile/
pnpm run update:production -- --message "Fix tests tab layout"
# or preview channel for internal testers:
pnpm run update:preview -- --message "QA build"
```

The app checks for updates on launch and when returning to foreground, then reloads automatically.

### When you must rebuild (not OTA)

- New or upgraded native dependencies (`expo-notifications`, `expo-camera`, etc.)
- Changed `app.json` permissions or plugins
- Bumped `expo.version` if you treat that as a new runtime (recommended for native changes)

---

## Push notifications

Teachers receive alerts when stack grading finishes (preview ready, commit complete, or failed).

### One-time: native build with notifications

`expo-notifications` requires a **new** EAS build (same build that enables OTA is fine):

```bash
eas build --platform ios --profile production
```

Push does not work in the iOS Simulator. Test on a physical device with a preview or production build.

### Backend

1. Run `pnpm run db:push` in `graider/` to create the `push_tokens` table.
2. Deploy the latest API (`POST /api/me/push-token`) and worker (sends via Expo Push API).
3. On Render worker env, set optional `EXPO_ACCESS_TOKEN` (expo.dev → Access tokens) for reliable delivery.

### Mobile behaviour

- After sign-in, teachers are prompted for notification permission.
- Token is registered with `POST /api/me/push-token`.
- Tapping a grading notification opens the Grade stack screen.

### Verify push end-to-end

1. Install a preview/production build on a physical iPhone.
2. Sign in as a teacher and accept notifications.
3. Start a stack grade, background the app while the worker runs.
4. Expect: **Stack ready to review** → tap → Grade stack screen.

---

## TestFlight smoke test checklist

- [ ] Sign in with Google
- [ ] Complete onboarding funnel (pre-auth sample grade)
- [ ] Create class + test
- [ ] Stack grade 3+ real paper photos via camera (HEIC from iPhone)
- [ ] Confirm matches → see results
- [ ] Slow network / long grading job polling (up to ~4 min)
- [ ] Background app during grading → push notification arrives → tap opens Grade stack
- [ ] OTA: run `pnpm run update:production`, relaunch app → update applies
- [ ] Student account lands in `/(student)`, teacher in `/(teacher)`

---

## Common blockers

| Symptom | Fix |
|---------|-----|
| API calls fail / hang | Set `EXPO_PUBLIC_APP_URL` without trailing slash; rebuild |
| Upload fails on device | Ensure FormData uses `{ uri, name, type }` blobs, not web `File` |
| Camera permission denied | Check `NSCameraUsageDescription` in `app.json`; reinstall app |
| Build missing env | `eas env:list --environment production` |
| Grading times out | Check Render worker + Redis; see backend ops doc |
| Wrong workspace after sign-in | `/api/me/role` must return correct `role` |

---

## Launch day

1. [ ] Production Clerk + `EXPO_PUBLIC_APP_URL` on EAS
2. [ ] Render worker healthy + `EXPO_ACCESS_TOKEN` set (push)
3. [ ] `pnpm run db:push` on production DB (`push_tokens` table)
4. [ ] **New native build** (includes OTA + push) — `eas build --platform ios --profile production`
5. [ ] TestFlight with fresh install on physical iPhone (push + OTA smoke test)
6. [ ] Submit for review
7. [ ] Monitor Vercel logs + Render worker for grading errors
8. [ ] JS hotfixes via `pnpm run update:production` (no store review)
