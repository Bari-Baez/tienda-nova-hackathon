import { createClient } from '@supabase/supabase-js';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const bucket = 'refund-photos';
const maxBody = 4_000_000;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const auth = (request) => { const expected = Buffer.from(process.env.DEMO_DASHBOARD_TOKEN || ''); const actual = Buffer.from((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')); return expected.length >= 24 && actual.length === expected.length && timingSafeEqual(actual, expected); };
const text = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
const number = (value, min, max) => { const n = Number(value); return value !== null && value !== '' && Number.isFinite(n) && n >= min && n <= max ? n : null; };
const imageType = (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg' : bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i]) ? 'image/png' : null;

async function post(request) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBody) return json(413, { error: 'request_too_large' });
  const form = await request.formData();
  const photo = form.get('photo');
  const name = text(form.get('name'), 120), phone = text(form.get('phone'), 24), description = text(form.get('description'), 2000);
  if (!name || !phone || !description || !photo || typeof photo.arrayBuffer !== 'function') return json(400, { error: 'missing_fields' });
  const digits = phone.replace(/\D/g, ''); if (digits.length < 7 || digits.length > 15) return json(400, { error: 'invalid_phone' });
  if (photo.size < 1 || photo.size > 3_500_000) return json(413, { error: 'invalid_photo_size' });
  const bytes = Buffer.from(await photo.arrayBuffer()), mime = imageType(bytes); if (!mime) return json(415, { error: 'invalid_photo_type' });
  const id = randomUUID(), receivedAt = new Date().toISOString(), filename = `${id}.${mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  let device = {}; try { device = JSON.parse(form.get('device') || '{}'); } catch { /* optional */ }
  const lat = number(form.get('latitude'), -90, 90), lon = number(form.get('longitude'), -180, 180), accuracy = number(form.get('accuracy'), 0, 1_000_000);
  const permission = ['granted','denied','prompt','unavailable'].includes(form.get('locationPermission')) ? form.get('locationPermission') : 'unavailable';
  const record = { id, receivedAt, name, phone, description, photo: { filename, mime, bytes: bytes.length, exif: { status: 'not_analyzed' } }, location: lat !== null && lon !== null ? { latitude: lat, longitude: lon, accuracy, source: 'client_reported_browser_geolocation', permission } : null, locationPermission: permission, network: { observedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, source: 'vercel_platform_header', forwardedFor: null }, browserHeaders: { userAgent: text(request.headers.get('user-agent'), 500), acceptLanguage: text(request.headers.get('accept-language'), 300) }, clientDevice: device };
  const client = db(); const uploaded = await client.storage.from(bucket).upload(filename, bytes, { contentType: mime, upsert: false }); if (uploaded.error) throw uploaded.error;
  const inserted = await client.from('demo_claims').insert({ id, received_at: receivedAt, photo_path: filename, record }); if (inserted.error) { await client.storage.from(bucket).remove([filename]); throw inserted.error; }
  return json(201, { id, receivedAt });
}

export default { async fetch(request) { try { if (request.method === 'POST') return await post(request); if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }); if (!auth(request)) return json(401, { error: 'dashboard_token_required' }); const result = await db().from('demo_claims').select('record').order('received_at', { ascending: false }).limit(100); if (result.error) throw result.error; return json(200, { claims: result.data.map(row => row.record) }); } catch (error) { console.error(error?.message || error); return json(500, { error: 'server_error' }); } } };
