# Graider subscriptions (RevenueCat + server limits)

Freemium stack grading with App Store subscriptions via RevenueCat. Web checkout uses the same entitlement — see [`graider/docs/subscriptions.md`](../../graider/docs/subscriptions.md).

## Tiers

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 1 owned class, 20 completed stack grades / calendar month |
| Pro monthly | **$24.99 / month** | Unlimited classes + stack grades |
| Pro annual | **$240 / year** | Same |

Pre-auth onboarding sample grade is **not** gated.

## RevenueCat setup

1. Create a RevenueCat project and iOS app (`com.davidtapestry.graider-mobile`).
2. Create entitlement identifier: **`pro`**
3. Create App Store subscription products:
   - `graider_pro_monthly` ($24.99/mo)
   - `graider_pro_annual` ($240/yr)
   Attach both to `pro`.
4. Create a **current offering** with `$rc_monthly` and `$rc_annual` packages.
5. Configure webhook:
   - URL: `https://<your-host>/api/webhooks/revenuecat`
   - Authorization: `Bearer <REVENUECAT_WEBHOOK_AUTH>` (same value as Vercel env)
6. Use Clerk `userId` as RevenueCat `app_user_id` (mobile calls `Purchases.logIn(userId)`).

## Environment variables

**Mobile (EAS):**

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — RevenueCat public iOS SDK key (`appl_…`)

**Backend (Vercel):**

- `REVENUECAT_SECRET_API_KEY` — secret key for subscriber API lookups
- `REVENUECAT_WEBHOOK_AUTH` — bearer token for webhook auth
- `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` — Web Billing public key for web checkout

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me/subscription` | Usage summary + tier (teacher only) |
| POST | `/api/me/subscription/sync` | Re-fetch subscriber from RevenueCat after purchase/restore |
| POST | `/api/webhooks/revenuecat` | RevenueCat webhook → updates `app_users.subscription_tier` |

Grade-stack preview/commit and class creation return **402** with `{ code: "GRADE_LIMIT" | "CLASS_LIMIT" }` when free limits are exceeded.

## Mobile integration

- `SubscriptionProvider` wraps the app (inside Clerk).
- Paywall modal: cream/paper/red-pen styling, purchase + restore.
- Gates: before stack upload, after first successful grade (soft upsell), class creation limit.

Real IAP requires a **development or production EAS build** — not Expo Go.
