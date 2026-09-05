import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreferenceRetry } from '../src/features/account/sync/preference-retry.ts';
import { preloadAvatar } from '../src/features/account/sync/preload-avatar.ts';
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('each new cycle retries failures and merges repeated foreground events', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const retry = createPreferenceRetry(async () => ++calls % 2 === 0, () => true);
  retry.start(); retry.start();
  await flush();
  retry.start();
  assert.equal(calls, 1);
  t.mock.timers.tick(1000); await flush();
  assert.equal(calls, 2);
  retry.start(); await flush();
  t.mock.timers.tick(1000); await flush();
  assert.equal(calls, 4);
  retry.dispose();
});

test('offline pauses retries and reconnection starts another bounded cycle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let online = true, calls = 0;
  const retry = createPreferenceRetry(async () => { calls++; return false; }, () => online);
  retry.start(); await flush();
  online = false; retry.pause();
  t.mock.timers.tick(20000); await flush();
  assert.equal(calls, 1);
  online = true; retry.start(); await flush();
  for (const delay of [1000, 3000, 10000, 20000]) {
    t.mock.timers.tick(delay); await flush();
  }
  assert.equal(calls, 5);
  retry.dispose(); retry.start(); await flush();
  assert.equal(calls, 5);
});

test('disposing during a request prevents further retries', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let complete, calls = 0;
  const retry = createPreferenceRetry(() => { calls++; return new Promise(r => complete = r); }, () => true);
  retry.start(); retry.dispose(); complete(false); await flush();
  t.mock.timers.tick(20000); await flush();
  assert.equal(calls, 1);
});

test('avatar only succeeds after image load; errors and timeout reject', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const previous = globalThis.Image;
  let image;
  globalThis.Image = class { constructor() { image = {}; return image; } };
  try {
    let loaded = false;
    const success = preloadAvatar('avatar').then(() => loaded = true);
    await flush(); assert.equal(loaded, false);
    image.onload(); await success; assert.equal(loaded, true);
    const failed = assert.rejects(preloadAvatar('broken'), /加载失败/);
    image.onerror(); await failed;
    const timeout = assert.rejects(preloadAvatar('slow'), /超时/);
    t.mock.timers.tick(10000); await timeout;
  } finally {
    if (previous === undefined) delete globalThis.Image;
    else globalThis.Image = previous;
  }
});
