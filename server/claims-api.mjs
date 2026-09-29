import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const DATA_DIR = resolve(process.env.DEMO_DATA_DIR || join(process.cwd(), '.demo-data'));
const PHOTOS_DIR = join(DATA_DIR, 'photos');
const RECORDS_FILE = join(DATA_DIR, 'claims.jsonl');
const dashboardToken = process.env.DEMO_DASHBOARD_TOKEN || randomBytes(24).toString('base64url');
let writeQueue = Promise.resolve();

export function announceDashboardToken() {
  console.info(`\nDashboard de la demostración: token local = ${dashboardToken}\n`);
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const expectedBytes = Buffer.from(dashboardToken);
  const providedBytes = Buffer.from(provided);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

async function readBounded(req) {
  const parts = [];
  let bytes = 0;
  for await (const part of req) {
    bytes += part.length;
    if (bytes > MAX_REQUEST_BYTES) {
      const error = new Error('request_too_large');
      error.status = 413;
      throw error;
    }
    parts.push(part);
  }
  return Buffer.concat(parts);
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function optionalNumber(value, min, max) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function cameraImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  return null;
}

function readExif(jpeg) {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return { status: 'not_jpeg' };
  let position = 2;
  try {
    while (position + 4 < jpeg.length && jpeg[position] === 0xff) {
      const marker = jpeg[position + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = jpeg.readUInt16BE(position + 2);
      if (length < 2 || position + 2 + length > jpeg.length) break;
      const start = position + 4;
      if (marker === 0xe1 && jpeg.subarray(start, start + 6).toString('ascii') === 'Exif\0\0') {
        return parseTiff(jpeg.subarray(start + 6, position + 2 + length));
      }
      position += 2 + length;
    }
  } catch {
    return { status: 'unreadable' };
  }
  return { status: 'absent' };
}

function parseTiff(tiff) {
  const little = tiff.subarray(0, 2).toString('ascii') === 'II';
  const big = tiff.subarray(0, 2).toString('ascii') === 'MM';
  if ((!little && !big) || tiff.length < 8) return { status: 'unreadable' };
  const u16 = (offset) => {
    if (offset < 0 || offset + 2 > tiff.length) throw new Error('invalid_exif');
    return little ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
  };
  const u32 = (offset) => {
    if (offset < 0 || offset + 4 > tiff.length) throw new Error('invalid_exif');
    return little ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);
  };
  try {
    if (u16(2) !== 42) return { status: 'unreadable' };
    const entries = (offset) => {
      const count = u16(offset);
      if (count > 256 || offset + 2 + count * 12 > tiff.length) throw new Error('invalid_exif');
      const result = new Map();
      for (let index = 0; index < count; index += 1) {
        const at = offset + 2 + index * 12;
        result.set(u16(at), { type: u16(at + 2), count: u32(at + 4), valueOffset: at + 8 });
      }
      return result;
    };
    const value = (entry) => {
      if (!entry) return null;
      const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 }[entry.type];
      if (!typeSize || entry.count > 4096 || entry.count * typeSize > 4096) return null;
      const size = entry.count * typeSize;
      const at = size <= 4 ? entry.valueOffset : u32(entry.valueOffset);
      if (at + size > tiff.length) return null;
      if (entry.type === 2) return tiff.subarray(at, at + size).toString('utf8').replace(/\0+$/, '').slice(0, 128);
      if (entry.type === 3) return entry.count === 1 ? u16(at) : Array.from({ length: entry.count }, (_, i) => u16(at + i * 2));
      if (entry.type === 4) return entry.count === 1 ? u32(at) : Array.from({ length: entry.count }, (_, i) => u32(at + i * 4));
      if (entry.type === 5) return Array.from({ length: entry.count }, (_, i) => {
        const denominator = u32(at + i * 8 + 4);
        return denominator ? u32(at + i * 8) / denominator : null;
      });
      return null;
    };
    const root = entries(u32(4));
    const make = value(root.get(0x010f));
    const model = value(root.get(0x0110));
    const exifOffset = value(root.get(0x8769));
    const exif = typeof exifOffset === 'number' ? entries(exifOffset) : new Map();
    const dateTime = value(exif.get(0x9003)) || value(root.get(0x0132));
    const gpsOffset = value(root.get(0x8825));
    let gps = null;
    if (typeof gpsOffset === 'number') {
      const tags = entries(gpsOffset);
      const latitudeParts = value(tags.get(0x0002));
      const longitudeParts = value(tags.get(0x0004));
      const latitudeRef = value(tags.get(0x0001));
      const longitudeRef = value(tags.get(0x0003));
      const coordinate = (parts, ref, negative) => {
        if (!Array.isArray(parts) || parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
        const decimal = parts[0] + parts[1] / 60 + parts[2] / 3600;
        return ref?.toUpperCase() === negative ? -decimal : decimal;
      };
      const latitude = coordinate(latitudeParts, latitudeRef, 'S');
      const longitude = coordinate(longitudeParts, longitudeRef, 'W');
      if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        gps = { latitude, longitude };
      }
    }
    return { status: 'present', make: make || null, model: model || null, dateTime: dateTime || null, gps };
  } catch {
    return { status: 'unreadable' };
  }
}

function deviceFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result = {};
  for (const key of ['userAgent', 'language', 'platform', 'timezone']) {
    if (typeof input[key] === 'string') result[key] = cleanText(input[key], 300);
  }
  for (const key of ['screenWidth', 'screenHeight', 'viewportWidth', 'viewportHeight']) {
    if (Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 100000) result[key] = input[key];
  }
  return result;
}

async function saveClaim(req, res) {
  if (!req.headers['content-type']?.startsWith('multipart/form-data')) return respond(res, 415, { error: 'multipart_required' });
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
    return respond(res, 403, { error: 'origin_mismatch' });
  }
  const body = await readBounded(req);
  const formRequest = new Request('http://local.demo/api/claims', {
    method: 'POST',
    headers: { 'content-type': req.headers['content-type'] },
    body,
  });
  let form;
  try {
    form = await formRequest.formData();
  } catch {
    return respond(res, 400, { error: 'invalid_multipart' });
  }
  const name = cleanText(form.get('name'), 120);
  const phone = cleanText(form.get('phone'), 24);
  const description = cleanText(form.get('description'), 2000);
  const photo = form.get('photo');
  if (!name || !phone || !description || !photo || typeof photo.arrayBuffer !== 'function') {
    return respond(res, 400, { error: 'missing_fields' });
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return respond(res, 400, { error: 'invalid_phone' });
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return respond(res, 413, { error: 'invalid_photo_size' });
  const bytes = Buffer.from(await photo.arrayBuffer());
  const mime = cameraImageType(bytes);
  if (!mime) return respond(res, 415, { error: 'invalid_photo_type' });
  let clientDevice = {};
  try { clientDevice = deviceFields(JSON.parse(form.get('device') || '{}')); } catch { /* Optional field. */ }
  const latitude = optionalNumber(form.get('latitude'), -90, 90);
  const longitude = optionalNumber(form.get('longitude'), -180, 180);
  const accuracy = optionalNumber(form.get('accuracy'), 0, 1000000);
  const permissionInput = form.get('locationPermission');
  const locationPermission = ['granted', 'denied', 'prompt', 'unavailable'].includes(permissionInput)
    ? permissionInput : 'unavailable';
  const location = latitude !== null && longitude !== null
    ? { latitude, longitude, accuracy, source: 'client_reported_browser_geolocation', permission: locationPermission }
    : null;
  const id = randomUUID();
  const receivedAt = new Date().toISOString();
  const photoFilename = `${id}.${mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  const remoteAddress = req.socket.remoteAddress || null;
  const record = {
    id, receivedAt, name, phone, description,
    photo: { filename: photoFilename, mime, bytes: bytes.length, exif: readExif(bytes) },
    location,
    locationPermission,
    network: { observedIp: remoteAddress?.replace(/^::ffff:/, '') || null, source: 'direct_socket', forwardedFor: null },
    browserHeaders: {
      userAgent: cleanText(req.headers['user-agent'], 500),
      acceptLanguage: cleanText(req.headers['accept-language'], 300),
    },
    clientDevice,
  };
  await mkdir(PHOTOS_DIR, { recursive: true });
  await writeFile(join(PHOTOS_DIR, photoFilename), bytes, { flag: 'wx' });
  writeQueue = writeQueue.catch(() => {}).then(() => appendFile(RECORDS_FILE, `${JSON.stringify(record)}\n`, 'utf8'));
  await writeQueue;
  respond(res, 201, { id, receivedAt });
}

async function listClaims(res) {
  await writeQueue;
  let records = [];
  try {
    const content = await readFile(RECORDS_FILE, 'utf8');
    records = content.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  respond(res, 200, { claims: records });
}

async function servePhoto(res, id) {
  await writeQueue;
  const content = await readFile(RECORDS_FILE, 'utf8').catch((error) => error.code === 'ENOENT' ? '' : Promise.reject(error));
  const record = content.split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((item) => item.id === id);
  if (!record) return respond(res, 404, { error: 'not_found' });
  const photo = await readFile(join(PHOTOS_DIR, record.photo.filename));
  res.statusCode = 200;
  res.setHeader('Content-Type', record.photo.mime);
  res.setHeader('Content-Length', photo.length);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(photo);
}

export async function handleClaimsApi(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const path = requestUrl.pathname;
  if (!path.startsWith('/api/claims')) return false;
  try {
    if (path === '/api/claims' && req.method === 'POST') {
      await saveClaim(req, res);
    } else if (!isAuthorized(req)) {
      respond(res, 401, { error: 'dashboard_token_required' });
    } else if (path === '/api/claims' && req.method === 'GET') {
      await listClaims(res);
    } else if (/^\/api\/claims\/[0-9a-f-]{36}\/photo$/.test(path) && req.method === 'GET') {
      await servePhoto(res, path.split('/')[3]);
    } else {
      respond(res, 404, { error: 'not_found' });
    }
  } catch (error) {
    if (!res.headersSent) respond(res, error.status || 500, { error: error.status ? error.message : 'server_error' });
  }
  return true;
}
