import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testDir = await mkdtemp(join(tmpdir(), 'claims-api-test-'));
const originalCwd = process.cwd();
process.chdir(testDir);
process.env.DEMO_DASHBOARD_TOKEN = 'test-dashboard-token';
const { handleClaimsApi } = await import('../server/claims-api.mjs');
const server = createServer((req, res) => {
  handleClaimsApi(req, res).then((handled) => {
    if (!handled) { res.statusCode = 404; res.end(); }
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const auth = { Authorization: 'Bearer test-dashboard-token' };

try {
  const denied = await fetch(`${base}/api/claims`);
  assert.equal(denied.status, 401);

  const photo = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const form = new FormData();
  form.set('name', '<script>Ada</script>');
  form.set('phone', '+1 809 555 0123');
  form.set('description', 'Pantalla defectuosa');
  form.set('photo', new Blob([photo], { type: 'image/jpeg' }), 'camera.jpg');
  form.set('device', JSON.stringify({ language: 'es-DO', screenWidth: 390, secret: 'discard' }));
  form.set('latitude', '18.5');
  form.set('longitude', '-69.9');
  form.set('accuracy', '14');
  form.set('locationPermission', 'granted');
  const submitted = await fetch(`${base}/api/claims`, { method: 'POST', body: form });
  assert.equal(submitted.status, 201);
  const { id } = await submitted.json();
  assert.match(id, /^[0-9a-f-]{36}$/);

  const listed = await fetch(`${base}/api/claims`, { headers: auth });
  assert.equal(listed.status, 200);
  const { claims } = await listed.json();
  assert.equal(claims.length, 1);
  assert.equal(claims[0].id, id);
  assert.equal(claims[0].phone, '+1 809 555 0123');
  assert.equal(claims[0].location.latitude, 18.5);
  assert.equal(claims[0].location.source, 'client_reported_browser_geolocation');
  assert.equal(claims[0].photo.exif.status, 'absent');
  assert.equal(claims[0].clientDevice.secret, undefined);
  assert.equal(claims[0].network.observedIp, '127.0.0.1');

  const privatePhoto = await fetch(`${base}/api/claims/${id}/photo`);
  assert.equal(privatePhoto.status, 401);
  const imageResponse = await fetch(`${base}/api/claims/${id}/photo`, { headers: auth });
  assert.equal(imageResponse.status, 200);
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), photo);

  const savedPhoto = await readFile(join(testDir, '.demo-data', 'photos', `${id}.jpg`));
  assert.deepEqual(savedPhoto, photo);

  const missingPhone = new FormData();
  missingPhone.set('name', 'Ada');
  missingPhone.set('description', 'Defecto');
  missingPhone.set('photo', new Blob([photo], { type: 'image/jpeg' }), 'camera.jpg');
  assert.equal((await fetch(`${base}/api/claims`, { method: 'POST', body: missingPhone })).status, 400);

  const bad = new FormData();
  bad.set('name', 'Ada');
  bad.set('phone', '+1 809 555 0123');
  bad.set('description', 'Defecto');
  bad.set('photo', new Blob(['<svg/>'], { type: 'image/jpeg' }), 'fake.jpg');
  assert.equal((await fetch(`${base}/api/claims`, { method: 'POST', body: bad })).status, 415);

  const oversized = new FormData();
  oversized.set('name', 'Ada');
  oversized.set('phone', '+1 809 555 0123');
  oversized.set('description', 'Defecto');
  oversized.set('photo', new Blob([Buffer.alloc(8 * 1024 * 1024 + 1, 0xff)], { type: 'image/jpeg' }), 'big.jpg');
  assert.equal((await fetch(`${base}/api/claims`, { method: 'POST', body: oversized })).status, 413);

  console.log('Claims API tests passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  process.chdir(originalCwd);
  await rm(testDir, { recursive: true, force: true });
}
