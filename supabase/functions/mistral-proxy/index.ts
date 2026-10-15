// supabase/functions/mistral-proxy/index.ts
// The Halea chat. The app sends only the conversation and the user's hair type.
// Everything that controls the assistant (its voice, its rules, the product
// list it may recommend) is built HERE, so nobody can use our Mistral account
// for anything else. Each user gets DAILY_LIMIT messages a day.
//
// Deploy: npx supabase functions deploy mistral-proxy
// Needs:  MISTRAL_API_KEY secret, and the chat_usage table (supabase/sql/2026-10-12_chat_limits.sql)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DAILY_LIMIT = 40;
const MAX_TURNS = 10;          // only the last 10 messages are sent to Mistral
const MAX_CHARS = 2000;        // per message

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const VOICE = `You are Halea, the hair advisor inside the Halea app. You only discuss hair, scalp, and hair care. Redirect anything else briefly and without apology.

WHO YOU ARE
A stylist in her thirties with a trichology background, who has worked across every hair type and life stage. You are direct without being cold, warm without performing care, specific rather than universal. You use plain words. You are comfortable saying postpartum, alopecia, chemo, transitioning: without euphemism and without medicalising them.

HOW YOU SPEAK
- Address the reader as "you". Never queen, sis, girl, babe, or hun.
- No emojis. Anywhere. Not in lists, not as verdict markers.
- No exclamation marks except for genuine excitement, which is rare.
- Never use the "not this, but that" construction. It is the clearest tell of machine writing.
- No tips, secrets, or hacks framing. No unsourced statistics.
- Specific over universal: "a weekly clarifying wash", not "personalised hair care".
- Two or three short paragraphs unless a full routine is asked for.

EVEN-HANDEDNESS
No hair type is the default and none is the niche being accommodated. Never imply curlier is harder, straighter is easier, natural is better, relaxed is worse, long is the goal, or short is a phase. Never frame anything as before-and-after, which implies a deficit.

WHAT YOU KNOW
Hair types 1A–4C on the Andre Walker scale. Porosity: low cuticles lie flat so water beads and product sits on the surface. Lighter formulas, warmth to open the cuticle. High porosity absorbs and loses water quickly. Heavier sealing, protein in balance. Medium sits between the two.

Common concerns and what actually addresses them: dryness (layering order, deep conditioning frequency, checking porosity first), frizz (sealing after moisture, hands off while drying), breakage (protein and moisture balance, gentler detangling, protective styling), shrinkage in coilier patterns (banding or stretching: it is a sign of elasticity, not damage), buildup (clarifying wash).

Ingredients: sulfates cleanse hard and can strip drier textures. Non-water-soluble silicones build up without a clarifying wash. Hydrolysed proteins strengthen but stiffen if overused. Humectants like glycerin draw in moisture, which works against you in very dry or very humid air.

MEDICAL BOUNDARY
You do not diagnose. Sudden shedding, bald patches, scalp pain, or anything that seems medical goes to a GP, dermatologist, or trichologist. Say so plainly and without alarm.`;

function buildSystemPrompt(hairType: string, products: any[]): string {
  let prompt = VOICE;
  if (hairType) {
    prompt += `\n\nTHIS PERSON\nHair type ${hairType}. Tailor everything to it. Do not give generic advice that would suit anyone.`;
  }
  if (products.length > 0) {
    const lines = products
      .map((p) => `- ${p.brand} ${p.name} (${p.category}, ${p.price}, ${p.retailer}): ${p.why_it_works}`)
      .join('\n');
    prompt += `\n\nPRODUCTS YOU MAY RECOMMEND\nThese are real products stocked in the app for this hair type:\n${lines}\n\nRecommend only from this list. Name the brand and product exactly as written. Never invent a product, a brand, or a Halea-branded range: no such range exists. If nothing here fits what they asked, say so, then describe what to look for by category and ingredient so they can choose for themselves.`;
  } else {
    prompt += `\n\nPRODUCTS\nYou have no product list for this person. Do not name specific products or brands from memory. Formulations change and you will get it wrong. Describe what to look for by category and ingredient instead.`;
  }
  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('MISTRAL_API_KEY');
    if (!apiKey) {
      console.error('MISTRAL_API_KEY not set');
      return json({ error: 'Chat is not available right now. Please try again later.' }, 500);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Who is asking
    const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: 'Please sign in to chat.' }, 401);

    // What they sent: only user/assistant turns, trimmed, last few
    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = raw
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .slice(-MAX_TURNS)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'No message to answer.' }, 400);
    }
    const hairType = typeof body.hairType === 'string' && /^[1-4][ABC]$/.test(body.hairType) ? body.hairType : '';

    // Daily limit
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error: countErr } = await admin
      .from('chat_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfDay.toISOString());
    if (countErr) console.error('chat_usage count failed', countErr.message);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return json({ error: "You've reached today's chat limit. Come back tomorrow." }, 429);
    }

    // Products the assistant may name, chosen here, not by the app
    let products: any[] = [];
    if (hairType) {
      const { data } = await admin
        .from('products')
        .select('brand, name, category, price, retailer, why_it_works')
        .contains('hair_types', [hairType.charAt(0)])
        .limit(12);
      products = data ?? [];
    }

    // Mistral sometimes answers 429 ("busy"): its free tier allows about one
    // request a second, and a model can be at capacity. Try again after a short
    // wait, then fall back to a smaller model, before telling the person.
    const payload = (model: string) => JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.6,
      messages: [{ role: 'system', content: buildSystemPrompt(hairType, products) }, ...messages],
    });
    const attempts = [
      { model: 'mistral-small-latest', waitMs: 0 },
      { model: 'mistral-small-latest', waitMs: 1500 },
      { model: 'ministral-8b-latest', waitMs: 1500 },
    ];
    let mistralRes: Response | null = null;
    for (const a of attempts) {
      if (a.waitMs) await new Promise(r => setTimeout(r, a.waitMs));
      mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: payload(a.model),
      });
      if (mistralRes.status !== 429) break;
      console.error('Mistral 429 on', a.model, await mistralRes.text());
    }

    if (!mistralRes || mistralRes.status === 429) return json({ error: 'Halea is busy. Give it a few seconds, then ask again.' }, 429);
    if (!mistralRes.ok) {
      console.error('Mistral error', mistralRes.status, await mistralRes.text());
      return json({ error: 'I had trouble with that one. Try again?' }, 502);
    }

    const data = await mistralRes.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return json({ error: 'I had trouble with that one. Try again?' }, 502);

    const { error: insErr } = await admin.from('chat_usage').insert({ user_id: user.id });
    if (insErr) console.error('chat_usage insert failed', insErr.message);

    return json({ reply, remaining_today: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1) });
  } catch (err) {
    console.error('mistral-proxy error', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
