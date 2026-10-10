// supabase/functions/ai-tryon/index.ts
// Hair try-on: selfie + reference photo -> Replicate (Nano Banana Pro) -> image URL.
// Free for everyone, with three limits so the bill can't run away:
//   1. PER_PHONE_PER_DAY   try-ons per phone per day (switching accounts doesn't reset it)
//   2. PER_ACCOUNT_PER_DAY try-ons per account per day (same account on two phones)
//   3. APP_DAILY_CAP       try-ons for the whole app per day. Your worst-case daily spend.
// Days reset at midnight UTC. Change the numbers and redeploy; no app update needed.
//
// Deploy: npx supabase functions deploy ai-tryon
// Needs:  npx supabase secrets set REPLICATE_API_TOKEN=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PER_PHONE_PER_DAY = 3;
const PER_ACCOUNT_PER_DAY = 3;
const APP_DAILY_CAP = 300;     // about $40 a day at 2K
const RESOLUTION = '2K';       // 4K costs about twice as much and looks the same on a phone

const PROMPT = `Transfer the exact hairstyle from the second image onto the person in the first image.
Match the colour, texture, length, volume and parting of the hair.
Keep the person's face, skin tone, expression, clothing, pose, lighting and background unchanged.
Photorealistic and natural.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Every error the app can show goes through here, with a message written for users.
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, code: string, error: string) => reply({ code, error }, status);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = Deno.env.get('REPLICATE_API_TOKEN');
    if (!token) {
      console.error('REPLICATE_API_TOKEN is not set');
      return fail(500, 'not-configured', 'Try-on is not available right now. Please try again later.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Who is asking
    const jwt = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) return fail(401, 'signed-out', 'Please sign in to use try-on.');

    const { selfie_base64, reference_base64, device_id } = await req.json().catch(() => ({}));
    if (!selfie_base64 || !reference_base64) {
      return fail(400, 'missing-photos', 'Add a selfie and a photo of the style you want.');
    }
    if (!device_id || typeof device_id !== 'string') {
      return fail(400, 'old-app', 'Please update Halea to use try-on.');
    }

    // Limits
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const since = startOfDay.toISOString();
    const countToday = async (column?: 'user_id' | 'device_id', value?: string) => {
      let q = supabase.from('tryon_history').select('id', { count: 'exact', head: true }).gte('created_at', since);
      if (column && value) q = q.eq(column, value);
      const { count, error } = await q;
      if (error) throw new Error(`count failed: ${error.message}`);
      return count ?? 0;
    };

    const [appToday, phoneToday, accountToday] = await Promise.all([
      countToday(),
      countToday('device_id', device_id),
      countToday('user_id', user.id),
    ]);

    if (appToday >= APP_DAILY_CAP) {
      return fail(429, 'paused', 'Try-on is resting for today. It will be back tomorrow.');
    }
    if (phoneToday >= PER_PHONE_PER_DAY || accountToday >= PER_ACCOUNT_PER_DAY) {
      return fail(429, 'daily-limit', `You've used your ${PER_PHONE_PER_DAY} free try-ons for today. Come back tomorrow for more.`);
    }

    // Run the try-on. "Prefer: wait" holds the request until the image is ready (up to 60s).
    const createRes = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait' },
      body: JSON.stringify({
        input: {
          prompt: PROMPT,
          image_input: [
            `data:image/jpeg;base64,${selfie_base64}`,
            `data:image/jpeg;base64,${reference_base64}`,
          ],
          resolution: RESOLUTION,
          aspect_ratio: 'match_input_image',
          output_format: 'png',
        },
      }),
    });

    let prediction = await createRes.json();
    if (!createRes.ok) {
      console.error('Replicate create failed', createRes.status, JSON.stringify(prediction));
      if (createRes.status === 429) return fail(429, 'busy', 'Try-on is busy. Please try again in a minute.');
      return fail(502, 'upstream', 'The try-on could not run. Please try again.');
    }

    // If it isn't finished yet, poll for up to another 60 seconds
    for (let i = 0; i < 60 && !['succeeded', 'failed', 'canceled'].includes(prediction.status); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${token}` } });
      prediction = await res.json();
    }

    if (prediction.status !== 'succeeded') {
      console.error('Replicate did not succeed', prediction.status, prediction.error);
      return fail(502, 'failed', 'The try-on did not work this time. Try a clearer, front-facing selfie.');
    }

    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    // Only successful try-ons count towards the limits
    const { error: insertErr } = await supabase.from('tryon_history').insert({
      user_id: user.id,
      device_id,
      resolution: RESOLUTION.toLowerCase(),
      source: 'replicate',
      output_url: outputUrl,
      model_version: 'nano-banana-pro',
    });
    if (insertErr) console.error('tryon_history insert failed', insertErr.message);

    return reply({
      success: true,
      output_url: outputUrl,
      remaining_today: Math.max(0, PER_PHONE_PER_DAY - phoneToday - 1),
    });
  } catch (err) {
    console.error('ai-tryon error', err);
    return fail(500, 'error', 'Something went wrong. Please try again.');
  }
});
