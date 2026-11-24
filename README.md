# R&A Media Productions

One installable app for R&A's productions, and only productions. Sign in once, then pick a production from the home screen.

- **App:** https://brass91.github.io/RA-Media-App/
- **Off The Map:** https://brass91.github.io/RA-Media-App/otm/
- **SailorBloodMo0n:** https://brass91.github.io/RA-Media-App/sbm/
- **Code:** https://github.com/BRASS91/RA-Media-App (GitHub user `BRASS91`, formerly `ransdell91`). GitHub Pages serves it at brass91.github.io; the old ransdell91.github.io address stopped working with the rename and doesn't redirect.
- **Data:** Supabase project `fbskjgluladhqocklyre` in the R&A Media Productions LLC organization. Every app's records are in `public.records`, tagged by `app` (`otm`, `sbm`).
- **Sign-in and access:** email and password, or an emailed code. Only addresses in `public.accounts` get in. Someone on the list with no password yet can choose one on the sign-in screen ("First time? Create your password", edge function `ra-first-password`).

## Account tiers
| Tier | Apps | Can change things | Manages accounts |
|---|---|---|---|
| Admin | All | Yes | Yes |
| Client | Only the ones picked | Yes, in those apps | No |
| Guest | Only the ones picked | No, view only | No |

Admins add, change and remove accounts in **Settings → Accounts & access**. The database enforces the tiers (row-level security), so the rules hold even outside the app. There is always at least one admin.

## Files
- `index.html`: the R&A home (sign-in, app launcher, settings)
- `otm/index.html`, `sbm/index.html`: the two production apps, each complete, with its own icons
- `sw.js`: one service worker for everything (offline app shell, push notifications)
- `manifest.webmanifest`, `icons/`: what phones need to install the app
- `vendor/`: the Supabase client library, bundled so the app works offline
- `supabase/`: database notes and the `otm-push` reminder function

## Adding a new app (for example, a client production)
1. Put it in its own folder, using `records` with its own `app` id (copy how `otm/` reads and writes).
2. Add it to `APPS` in `index.html`, and its files to `SHELL` in `sw.js`.
3. Give people access in Settings → Accounts & access.

## Not part of the hub
- **Farm R&A** was inside the hub from Nov 4 to Nov 24, 2026 and was taken back out: the hub is for production work only. Its code is kept in [BRASS91/Farm-Journal](https://github.com/BRASS91/Farm-Journal), which will become its own app again.

## Retired repos
These only redirect into this app now:
- [BRASS91/Off-the-Map-App](https://github.com/BRASS91/Off-the-Map-App) → `otm/`
- [BRASS91/Sailorbloodmo0n-Production-App](https://github.com/BRASS91/Sailorbloodmo0n-Production-App) → `sbm/`

## Updating
Edit and push to `main`. GitHub Pages republishes in about a minute. Bump `VERSION` in `sw.js` when cached files change; phones pick up the new version the next time the app opens with a connection.
