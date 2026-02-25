#!/usr/bin/env node
/*
 * THM-like isolation smoke:
 * - start same challenge with two student tokens
 * - verify session network/cidr/machine differs
 *
 * Required env:
 * - PMP_BASE_URL (default: http://localhost:8000)
 * - PMP_TOKEN_A
 * - PMP_TOKEN_B
 * - CHALLENGE_CODE (default: PAY-001)
 */

const baseUrl = process.env.PMP_BASE_URL || 'http://localhost:8000';
const tokenA = process.env.PMP_TOKEN_A || '';
const tokenB = process.env.PMP_TOKEN_B || '';
const challengeCode = process.env.CHALLENGE_CODE || 'PAY-001';

if (!tokenA || !tokenB) {
  console.error('[isolation] missing PMP_TOKEN_A or PMP_TOKEN_B');
  process.exit(1);
}

function makeHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function call(token, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: makeHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function start(token) {
  const started = await call(token, 'POST', `/api/ctf/challenges/${encodeURIComponent(challengeCode)}/start`, {
    mode: 'GUIDED',
    learnerProfile: 'INTERMEDIATE',
  });
  if (!started?.session?.sessionId) {
    throw new Error('missing sessionId');
  }
  return started.session;
}

(async () => {
  let a;
  let b;
  try {
    a = await start(tokenA);
    b = await start(tokenB);

    console.log(`[isolation] A session=${a.sessionId} ip=${a.machineIp} code=${a.sessionCode}`);
    console.log(`[isolation] B session=${b.sessionId} ip=${b.machineIp} code=${b.sessionCode}`);

    if (a.sessionId === b.sessionId) {
      throw new Error('session ids are identical');
    }
    if (a.sessionCode === b.sessionCode) {
      throw new Error('session codes are identical');
    }
    if (a.machineIp && b.machineIp && a.machineIp === b.machineIp) {
      throw new Error('machine ips are identical');
    }

    console.log('[isolation] basic isolation checks passed');
  } catch (error) {
    console.error('[isolation] failed:', error.message || String(error));
    process.exitCode = 1;
  } finally {
    if (a?.sessionId) {
      try { await call(tokenA, 'DELETE', `/api/ctf/sessions/${encodeURIComponent(a.sessionId)}`); } catch {}
    }
    if (b?.sessionId) {
      try { await call(tokenB, 'DELETE', `/api/ctf/sessions/${encodeURIComponent(b.sessionId)}`); } catch {}
    }
  }
})();

