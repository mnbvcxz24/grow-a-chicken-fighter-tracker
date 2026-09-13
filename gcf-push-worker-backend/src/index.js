import webpush from 'web-push';

// ---- Same cycle logic as the app, kept in sync manually ----
const EVENTS = [
  { name: "UFO invasion", emoji: "🛸" },
  { name: "Chicken boss", emoji: "🐔" },
  { name: "Jurassic event", emoji: "🦖" },
  { name: "Golden goose", emoji: "🐤" },
  { name: "Hot egg", emoji: "🐣" }
];
// Same fixed reference instant as the app: Sept 13, 2026, 10:40 AM PH = 02:40 UTC.
// Epoch-based (not "minutes since PH midnight") because 50 doesn't divide 1440 evenly.
const ANCHOR_EPOCH_MIN = Date.UTC(2026, 8, 13, 2, 40, 0) / 60000;
const CYCLE = EVENTS.length * 10; // minutes — 50 with 5 events
const UPCOMING_OFFSET = 3; // minutes into the block before it flips to UPCOMING

function cyclePosAt(epochMin) {
  return (((epochMin - ANCHOR_EPOCH_MIN) % CYCLE) + CYCLE) % CYCLE;
}

async function handleSubscribe(request, env) {
  const body = await request.json();
  const { subscription, notifyFor } = body;
  if (!subscription || !subscription.endpoint || !Array.isArray(notifyFor)) {
    return new Response('Bad request', { status: 400 });
  }
  const key = `sub:${subscription.endpoint}`;
  await env.SUBSCRIPTIONS.put(key, JSON.stringify({ subscription, notifyFor }));
  return new Response('OK', { status: 200, headers: corsHeaders() });
}

async function handleUnsubscribe(request, env) {
  const body = await request.json();
  const endpoint = body.endpoint;
  if (!endpoint) return new Response('Bad request', { status: 400 });
  await env.SUBSCRIPTIONS.delete(`sub:${endpoint}`);
  return new Response('OK', { status: 200, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

async function runScheduledCheck(env) {
  const t = Date.now() / 60000; // epoch minutes — timezone-agnostic, no PH conversion needed
  const pos = cyclePosAt(t);
  const eventIndex = Math.floor(pos / 10) % EVENTS.length;
  const posInBlock = pos % 10;

  // Only act in the exact minute the block flips into UPCOMING
  if (Math.floor(posInBlock) !== UPCOMING_OFFSET) return;

  const upcomingIndex = (eventIndex + 1) % EVENTS.length;
  const ev = EVENTS[upcomingIndex];

  webpush.setVapidDetails(
    'mailto:admin@example.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: `${ev.emoji} ${ev.name} is coming up!`,
    body: 'Grow a Chicken Fighter — get ready, it goes live in 7 minutes'
  });

  const list = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' });
  for (const key of list.keys) {
    const raw = await env.SUBSCRIPTIONS.get(key.name);
    if (!raw) continue;
    const { subscription, notifyFor } = JSON.parse(raw);
    if (!notifyFor[upcomingIndex]) continue;
    try {
      await webpush.sendNotification(subscription, payload);
    } catch (err) {
      // Subscription is dead (user uninstalled, permission revoked, etc.) — clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        await env.SUBSCRIPTIONS.delete(key.name);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }
    if (url.pathname === '/unsubscribe' && request.method === 'POST') {
      return handleUnsubscribe(request, env);
    }
    return new Response('GCF push scheduler is running', { status: 200 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledCheck(env));
  }
};
