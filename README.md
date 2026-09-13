# 🐔 Grow a Chicken Fighter — Event Tracker

A live, installable web app that tracks the rotating world-event cycle for the
Roblox game **Grow a Chicken Fighter**, using Philippine (PH) time.

**🛸 UFO Invasion → 🐔 Chicken Boss → 🦖 Jurassic Event → 🐤 Golden Goose → 🐣 Hot Egg** — repeats every 50 minutes.

---

## Features

- **Live PH clock** and current event status (LIVE for 3 min, then UPCOMING for 7 min)
- **Next 1 hour schedule** — a rolling table of every upcoming LIVE/UPCOMING transition
- **Installable PWA** — add it to your phone's home screen, works offline
- **Push notifications** — get notified before an event goes live, even with the app fully closed (requires the companion backend — see below)
- **Egg lay calculator** — enter seconds-per-egg (up to 2 chickens) to see projected eggs per hour/12 hours/day

---

## Hosting this app (GitHub Pages)

1. Push the contents of this folder to a GitHub repository
2. Go to **Settings → Pages** in your repo
3. Under "Build and deployment," set **Source** to `Deploy from a branch`, pick your branch (e.g. `main`) and the `/ (root)` folder
4. Save — GitHub will give you a live URL like `https://<username>.github.io/<repo-name>/`

All asset paths in this app are relative, so it works whether it's hosted at
your domain root or in a GitHub Pages project subfolder.

### Installing it on your phone

Once hosted on a real `https://` URL:
- **Android/Chrome:** open the link → tap the **⬇️ Install App** button that appears in the app, or use Chrome's menu → "Add to Home screen"
- **iPhone/Safari:** open the link → tap **Share** → **"Add to Home Screen"** (Apple doesn't allow apps to trigger this automatically)

---

## Enabling push notifications (optional)

Notifications work even when the app is fully closed, but this requires a
small free backend. See **`gcf-push-worker-backend/DEPLOY-GUIDE.md`** for the
full step-by-step (uses Cloudflare Workers — free tier, no credit card
needed). Once deployed, paste your Worker URL into `index.html`:

```js
const PUSH_SERVER_URL = "https://your-worker-url.workers.dev";
```

---

## Tech notes

- No build step — plain HTML/CSS/JS, works as-is
- Timezone handling uses `Intl.DateTimeFormat` (not the unreliable `toLocaleString → new Date()` round-trip)
- Event timing is calculated from a fixed absolute anchor instant (`ANCHOR_EPOCH_MIN` in `index.html`), not "minutes since midnight" — this matters because the 50-minute cycle doesn't divide evenly into a 24-hour day, so a day-relative anchor would drift at midnight. If the event order or timing is ever recalibrated, update `ANCHOR_EPOCH_MIN` in both `index.html` and `gcf-push-worker-backend/src/index.js` to match
- Service worker caches all assets for offline use

---

## Credits

Created by **Albert Aldemita**, with **Claude AI**.

## Disclaimer

This is an **unofficial, fan-made tool**. It is **not affiliated with,
endorsed by, or connected to Roblox Corporation** or the developers of
*Grow a Chicken Fighter*. All game names, trademarks, and related content
belong to their respective owners. Event timing is based on community-
observed patterns and may not always be perfectly accurate — always verify
against the actual in-game event display.
