import webpush from 'web-push';

// ---- Same cycle logic as the app, kept in sync manually ----
const EVENTS = [
  { name: "UFO invasion", emoji: "🛸" },
  { name: "Chicken boss", emoji: "🐔" },
  { name: "Golden goose", emoji: "🐤" },
  { name: "Hot egg", emoji: "🍳" }
];
const ANCHOR_MIN = 17 * 60; // 5:00 PM PH time = start of UFO invasion
const CYCLE = 40;
const UPCOMING_OFFSET = 3; // minutes into the block before it flips to UPCOMING

function cyclePosAt(t) {
  return (((t - ANCHOR_MIN) % CYCLE) + CYCLE) % CYCLE;
}

function getPHMinutesNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', hour12: false,
    hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date());
  const obj = {};
  parts.forEach(p => obj[p.type] = p.value);
  return parseInt(obj.hour, 10) * 60 + parseInt(obj.minute, 10);
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
  const t = getPHMinutesNow();
  const pos = cyclePosAt(t);
  const eventIndex = Math.floor(pos / 10) % 4;
  const posInBlock = pos % 10;

  // Only act in the exact minute the block flips into UPCOMING
  if (Math.floor(posInBlock) !== UPCOMING_OFFSET) return;

  const upcomingIndex = (eventIndex + 1) % 4;
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
