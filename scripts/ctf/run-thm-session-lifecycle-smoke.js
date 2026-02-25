#!/usr/bin/env node
/*
 * THM-like lab lifecycle smoke:
 * - start session
 * - get session
 * - extend session
 * - reset session
 * - terminate session
 *
 * Required env:
 * - PMP_BASE_URL (default: http://localhost:8000)
 * - PMP_TOKEN
 * - CHALLENGE_CODE (default: PAY-001)
 */

const baseUrl = process.env.PMP_BASE_URL || 'http://localhost:8000';
const token = process.env.PMP_TOKEN || '';
const challengeCode = process.env.CHALLENGE_CODE || 'PAY-001';

if (!token) {
  console.error('[smoke] missing PMP_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function call(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

(async () => {
  try {
    console.log(`[smoke] challenge=${challengeCode} baseUrl=${baseUrl}`);

    const started = await call('POST', `/api/ctf/challenges/${encodeURIComponent(challengeCode)}/start`, {
      mode: 'GUIDED',
      learnerProfile: 'INTERMEDIATE',
    });
    const sessionId = started?.session?.sessionId;
    const sessionCode = started?.session?.sessionCode;
    if (!sessionId || !sessionCode) {
      throw new Error('start response did not include sessionId/sessionCode');
    }
    console.log(`[smoke] start ok sessionId=${sessionId} sessionCode=${sessionCode}`);

    const fetched = await call('GET', `/api/ctf/challenges/${encodeURIComponent(challengeCode)}/session`);
    console.log(`[smoke] get session ok status=${fetched?.session?.status || 'NONE'}`);

    if (fetched?.session?.canExtend) {
      const extended = await call('POST', `/api/ctf/sessions/${encodeURIComponent(sessionId)}/extend`);
      console.log(`[smoke] extend ok expiresAt=${extended?.session?.expiresAt || 'n/a'}`);
    } else {
      console.log('[smoke] extend skipped (not extendable)');
    }

    const reset = await call('POST', `/api/ctf/sessions/${encodeURIComponent(sessionId)}/reset`);
    const resetSessionId = reset?.session?.sessionId;
    console.log(`[smoke] reset ok newSessionId=${resetSessionId || 'n/a'}`);

    const terminateTarget = resetSessionId || sessionId;
    const terminated = await call('DELETE', `/api/ctf/sessions/${encodeURIComponent(terminateTarget)}`);
    console.log(`[smoke] terminate ok status=${terminated?.session?.status || 'n/a'}`);

    console.log('[smoke] lifecycle passed');
  } catch (error) {
    console.error('[smoke] lifecycle failed:', error.message || String(error));
    process.exit(1);
  }
})();

