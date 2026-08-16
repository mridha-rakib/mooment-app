import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const apiSource = readFileSync(join(process.cwd(), "lib/api.ts"), "utf8");
const authStoreSource = readFileSync(join(process.cwd(), "stores/authStore.ts"), "utf8");
const socketSource = readFileSync(join(process.cwd(), "lib/socketClient.ts"), "utf8");
const messagesSource = readFileSync(join(process.cwd(), "app/(tabs)/messages.tsx"), "utf8");

test("REST and Socket.IO share one configured token refresh promise", () => {
  assert.match(apiSource, /export const refreshConfiguredAuthToken/);
  assert.match(apiSource, /if \(!refreshTokenPromise\)/);
  assert.match(socketSource, /await refreshConfiguredAuthToken\(\{ clearOnUnauthorized: true \}\)/);
  assert.match(apiSource, /error\.response\?\.status === 401/);
  assert.match(apiSource, /handleUnauthorized\(\)/);
});

test("socket auth recovery is limited and bound to the rejected socket session", () => {
  assert.match(socketSource, /error\.data\?\.code === SOCKET_AUTH_ERROR_CODE/);
  assert.match(socketSource, /if \(authRecoveryAttempted \|\| authRecoveryPromise/);
  assert.match(socketSource, /socket !== activeSocket \|\| currentAccessToken !== rejectedToken/);
  assert.match(socketSource, /rejectedAccessToken = currentAccessToken/);
  assert.match(socketSource, /currentAccessToken !== rejectedAccessToken/);
  assert.match(socketSource, /activeSocket\.auth = \{ token: refreshedToken \}/);
  assert.match(socketSource, /activeSocket\.connect\(\)/);
});

test("logout and session changes cancel a late refresh result", () => {
  assert.match(authStoreSource, /set\(\{ isLoading: true, isLoggingOut: true \}\)/);
  assert.match(authStoreSource, /currentAuthState\.refreshToken !== storedRefreshToken/);
  assert.match(authStoreSource, /latestAuthState\.refreshToken !== storedRefreshToken/);
  assert.match(authStoreSource, /enqueueAuthPersistence\(clearStoredAuthState\)/);
});

test("presence subscriptions unregister the exact listener passed to socket.on", () => {
  assert.match(socketSource, /registeredSocketListeners\.get\(handlers\)/);
  assert.match(socketSource, /activeSocket\.on\(eventName, listener\)/);
  assert.match(socketSource, /activeSocket\.off\(eventName, listener\)/);
  assert.doesNotMatch(socketSource, /activeSocket\.off\(eventName, handler/);
});

test("DM and group lists both reconcile after reconnect without a DM loading reset", () => {
  const reconnectStart = messagesSource.indexOf("onReconnected: () => {");
  assert.ok(reconnectStart > -1);
  const reconnectBlock = messagesSource.slice(reconnectStart, messagesSource.indexOf("},", reconnectStart));

  assert.match(reconnectBlock, /loadDirectMessages\(\{ showLoading: false \}\)/);
  assert.match(reconnectBlock, /loadGroups\(\)/);
  assert.match(messagesSource, /if \(dmLoadPromiseRef\.current\)/);
  assert.match(messagesSource, /realtimeRevisionAtStart !== dmRealtimeRevisionRef\.current/);
});
