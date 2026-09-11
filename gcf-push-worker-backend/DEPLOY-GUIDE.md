# Grow a Chicken Fighter — Push Notification Backend (Deploy Guide)

This is the "always-on scheduler" that lets notifications work even when the
app is fully closed on your phone. It runs on **Cloudflare Workers**, which
is free and never sleeps — unlike your phone, it doesn't get throttled or
minimized.

You only need to set this up **once**. It costs $0 on Cloudflare's free tier
for this kind of light, scheduled traffic.

---

## What you need first

- A free Cloudflare account: https://dash.cloudflare.com/sign-up
- Node.js installed on your computer (to run the deploy command)

---

## Step 1 — Install the Cloudflare CLI (Wrangler)

Open a terminal in this folder and run:

```
npm install
npm install -g wrangler
wrangler login
```

This opens a browser tab to connect your Cloudflare account.

---

## Step 2 — Create the KV storage (holds who's subscribed to what)

```
wrangler kv:namespace create SUBSCRIPTIONS
```

It will print something like:
```
[[kv_namespaces]]
binding = "SUBSCRIPTIONS"
id = "abc123..."
```

Copy that `id` value and paste it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

---

## Step 3 — Add your VAPID keys as secrets

These keys prove to Google/Apple's push servers that the notifications are
really coming from you. They were already generated for you:

```
Public key:  BI7orXvy9IeiHAVlMzQKPaWCA8LXanm9z8qo7nlRiDSKCi691L4cbTMx2iO87-BJvvQ5wLjqSqbFBsEBBAt3saA
Private key: 0WMaIqeP15o9_HD0V6K9nz5R0WRpCGYNIPvRyKxGvr8
```

Run this and paste the private key when prompted:

```
wrangler secret put VAPID_PRIVATE_KEY
```

Also add the public key as a normal (non-secret) variable — open
`wrangler.toml` and add this line under the existing config:

```
[vars]
VAPID_PUBLIC_KEY = "BI7orXvy9IeiHAVlMzQKPaWCA8LXanm9z8qo7nlRiDSKCi691L4cbTMx2iO87-BJvvQ5wLjqSqbFBsEBBAt3saA"
```

**Keep the private key secret — never put it in the app's front-end code.**
The public key is safe to share and is already wired into the app files.

---

## Step 4 — Deploy

```
wrangler deploy
```

It'll print a URL like:
```
https://gcf-push-scheduler.<your-subdomain>.workers.dev
```

**Copy this URL** — you need to paste it into the main app's `index.html`,
in the line near the top of the script that says:

```js
const PUSH_SERVER_URL = "PASTE_YOUR_WORKER_URL_HERE";
```

Then re-host your app files (Netlify/GitHub Pages) as usual.

---

## How it works, in short

- Every minute, Cloudflare runs a tiny check: "did any event just enter its
  UPCOMING window?"
- If yes, it looks up everyone who subscribed and wants that event, and
  sends them a real push notification — no phone app needs to be open.
- Your phone's service worker (already set up in the main app) receives the
  push and shows the notification, even from a fully closed app.

## Cost

Free tier includes 100,000 requests/day and enough free cron-trigger runs
for this (1,440 runs/day from the once-a-minute check). You will not be
charged for personal use at this scale.
