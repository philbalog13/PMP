import express, { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';

type JwtUserPayload = {
    userId?: string;
    id?: string;
    sub?: string;
    role?: string;
    exp?: number;
};

type CachedTarget = {
    targetUrl: string;
    sessionId: string;
    expiresAtMs: number;
};

type ProxyRequest = Request & {
    labTargetUrl?: string;
    labSessionId?: string;
    labStudentId?: string;
};

const app = express();
app.set('trust proxy', true);

const PORT = Number(process.env.PORT || 8099);
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:8000';
const LAB_INTERNAL_PROXY_SECRET = process.env.LAB_INTERNAL_PROXY_SECRET || process.env.INTERNAL_HSM_SECRET || '';
const LAB_AUTH_COOKIE_NAME = process.env.LAB_AUTH_COOKIE_NAME || 'lab_access_token';
const LAB_AUTH_COOKIE_SECURE = String(process.env.LAB_AUTH_COOKIE_SECURE || 'auto').toLowerCase();
const LAB_AUTH_COOKIE_TTL_SECONDS = Number(process.env.LAB_AUTH_COOKIE_TTL_SECONDS || 900);
const JWT_SECRET = process.env.JWT_SECRET || '';
const RESOLVE_CACHE_TTL_MS = Number(process.env.LAB_PROXY_CACHE_TTL_MS || 15000);

const targetCache = new Map<string, CachedTarget>();

function normalizeBasePath(basePath: string): string {
    const trimmed = String(basePath || '').replace(/^\/+|\/+$/g, '');
    return `/${trimmed || 'lab'}`;
}

const LAB_ACCESS_PROXY_BASE_PATH = normalizeBasePath(process.env.LAB_ACCESS_PROXY_BASE_PATH || '/lab');

function getBearerToken(headerValue: string | undefined): string | null {
    const value = String(headerValue || '').trim();
    if (!value.toLowerCase().startsWith('bearer ')) {
        return null;
    }
    const token = value.slice(7).trim();
    return token || null;
}

function getTokenFromQuery(req: Request): string | null {
    const candidate = req.query.access_token || req.query.token;
    if (!candidate) {
        return null;
    }

    if (Array.isArray(candidate)) {
        return String(candidate[0] || '').trim() || null;
    }

    return String(candidate).trim() || null;
}

function getCookies(req: Request): Record<string, string> {
    const headerValue = String(req.headers.cookie || '');
    if (!headerValue) {
        return {};
    }

    const cookies: Record<string, string> = {};
    for (const segment of headerValue.split(';')) {
        const trimmed = segment.trim();
        if (!trimmed) {
            continue;
        }
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) {
            continue;
        }
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!key) {
            continue;
        }
        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    }

    return cookies;
}

function getTokenFromCookie(req: Request): string | null {
    const token = String(getCookies(req)[LAB_AUTH_COOKIE_NAME] || '').trim();
    return token || null;
}

function isSecureRequest(req: Request): boolean {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim()
        .toLowerCase();
    return req.secure || forwardedProto === 'https';
}

function shouldUseSecureCookie(req: Request): boolean {
    if (LAB_AUTH_COOKIE_SECURE === 'true') {
        return true;
    }
    if (LAB_AUTH_COOKIE_SECURE === 'false') {
        return false;
    }
    return isSecureRequest(req);
}

function buildCookieString(name: string, value: string, options: {
    maxAgeSeconds: number;
    path: string;
    secure: boolean;
}): string {
    const maxAge = Number.isFinite(options.maxAgeSeconds) ? Math.max(0, Math.floor(options.maxAgeSeconds)) : 0;
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Max-Age=${maxAge}`,
        `Path=${options.path}`,
        'HttpOnly',
        'SameSite=Lax',
    ];
    if (options.secure) {
        parts.push('Secure');
    }
    return parts.join('; ');
}

function getSessionAttackboxPath(sessionCode: string): string {
    return `${LAB_ACCESS_PROXY_BASE_PATH}/sessions/${sessionCode}/attackbox`;
}

function setAuthCookie(res: Response, req: Request, sessionCode: string, token: string): void {
    res.setHeader('Set-Cookie', buildCookieString(LAB_AUTH_COOKIE_NAME, token, {
        maxAgeSeconds: LAB_AUTH_COOKIE_TTL_SECONDS,
        path: getSessionAttackboxPath(sessionCode),
        secure: shouldUseSecureCookie(req),
    }));
}

function clearAuthCookie(res: Response, req: Request, sessionCode: string): void {
    res.setHeader('Set-Cookie', buildCookieString(LAB_AUTH_COOKIE_NAME, '', {
        maxAgeSeconds: 0,
        path: getSessionAttackboxPath(sessionCode),
        secure: shouldUseSecureCookie(req),
    }));
}

function stripTokenQuery(urlValue: string): string {
    try {
        const parsed = new URL(urlValue, 'http://localhost');
        parsed.searchParams.delete('access_token');
        parsed.searchParams.delete('token');
        const search = parsed.searchParams.toString();
        return search ? `${parsed.pathname}?${search}` : parsed.pathname;
    } catch {
        return urlValue;
    }
}

function getStudentIdFromToken(token: string): string | null {
    if (!JWT_SECRET) {
        return null;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
        const candidate = payload.userId || payload.id || payload.sub || '';
        const normalized = String(candidate).trim();
        return normalized || null;
    } catch {
        return null;
    }
}

function cacheKey(studentId: string, sessionCode: string): string {
    return `${studentId}::${sessionCode}`;
}

function mountPath(basePath: string): string {
    return `${basePath}/sessions/:sessionCode/attackbox`;
}

function mountAuthPath(basePath: string): string {
    return `${mountPath(basePath)}/auth`;
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteAttackboxPath(path: string, req: Request): string {
    const rawBase = String(LAB_ACCESS_PROXY_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
    const normalizedBase = `/${rawBase}`;

    // Extract sessionCode from req.params (HTTP) or fall back to URL parsing (WebSocket upgrade)
    let sessionCode = String(req.params?.sessionCode || '').trim();
    if (!sessionCode) {
        const urlPath = String(req.originalUrl || req.url || path || '');
        const pattern = new RegExp(`${escapeRegex(normalizedBase)}/sessions/([^/]+)/attackbox`);
        const match = urlPath.match(pattern);
        sessionCode = match ? match[1] : '';
    }

    const prefix = `${normalizedBase}/sessions/${sessionCode}/attackbox`;
    const prefixRegex = new RegExp(`^${escapeRegex(prefix)}(?=\\/|$)`);

    const [pathname, queryString] = String(path || '/').split('?', 2);
    const stripped = pathname.replace(prefixRegex, '') || '/';
    const rewritten = stripped.startsWith('/') ? stripped : `/${stripped}`;

    return queryString ? `${rewritten}?${queryString}` : rewritten;
}

async function resolveTarget(req: ProxyRequest, res: Response, next: NextFunction): Promise<void> {
    const sessionCode = String(req.params.sessionCode || '').trim();
    if (!sessionCode) {
        res.status(400).json({ success: false, error: 'Missing sessionCode' });
        return;
    }

    const tokenFromHeader = getBearerToken(String(req.headers.authorization || ''));
    const tokenFromCookie = getTokenFromCookie(req);
    const tokenFromQuery = getTokenFromQuery(req);
    const token = tokenFromHeader || tokenFromCookie || tokenFromQuery;
    if (!token) {
        res.status(401).json({ success: false, error: 'Missing access token' });
        return;
    }

    const studentId = getStudentIdFromToken(token);
    if (!studentId) {
        if (tokenFromCookie) {
            clearAuthCookie(res, req, sessionCode);
        }
        res.status(401).json({ success: false, error: 'Invalid token' });
        return;
    }

    if (tokenFromQuery && tokenFromQuery === token) {
        setAuthCookie(res, req, sessionCode, token);
        const sanitizedUrl = stripTokenQuery(String(req.originalUrl || req.url || ''));
        if (sanitizedUrl && sanitizedUrl !== req.originalUrl) {
            res.setHeader('Cache-Control', 'no-store');
            res.redirect(302, sanitizedUrl);
            return;
        }
    }

    if (tokenFromHeader && tokenFromHeader === token) {
        setAuthCookie(res, req, sessionCode, token);
    }

    if (!LAB_INTERNAL_PROXY_SECRET) {
        res.status(500).json({ success: false, error: 'LAB_INTERNAL_PROXY_SECRET not configured' });
        return;
    }

    const key = cacheKey(studentId, sessionCode);
    const cached = targetCache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAtMs > now) {
        req.labTargetUrl = cached.targetUrl;
        req.labSessionId = cached.sessionId;
        req.labStudentId = studentId;
        next();
        return;
    }

    try {
        const response = await axios.get(
            `${API_GATEWAY_URL}/api/ctf/internal/lab/sessions/${encodeURIComponent(sessionCode)}/resolve`,
            {
                timeout: 8000,
                headers: {
                    'x-internal-secret': LAB_INTERNAL_PROXY_SECRET,
                    'x-student-id': studentId,
                },
            }
        );

        if (!response.data?.success || !response.data?.targetUrl) {
            res.status(404).json({ success: false, error: 'Session access unavailable' });
            return;
        }

        const targetUrl = String(response.data.targetUrl);
        const sessionId = String(response.data.sessionId || '');

        targetCache.set(key, {
            targetUrl,
            sessionId,
            expiresAtMs: now + RESOLVE_CACHE_TTL_MS,
        });

        req.labTargetUrl = targetUrl;
        req.labSessionId = sessionId;
        req.labStudentId = studentId;
        next();
    } catch (error: any) {
        const status = Number(error?.response?.status || 502);
        const message = String(error?.response?.data?.error || error?.message || 'Resolve failed');
        res.status(status).json({ success: false, error: message });
    }
}

const proxy = createProxyMiddleware({
    target: 'http://127.0.0.1:9',
    changeOrigin: true,
    ws: true,
    xfwd: true,
    router: (req) => (req as ProxyRequest).labTargetUrl || 'http://127.0.0.1:9',
    pathRewrite: (path, req) => rewriteAttackboxPath(path, req as Request),
    onProxyReq: (proxyReq, req) => {
        const proxyRequest = req as ProxyRequest;
        if (proxyRequest.labSessionId) {
            proxyReq.setHeader('x-lab-session-id', proxyRequest.labSessionId);
        }
        if (proxyRequest.labStudentId) {
            proxyReq.setHeader('x-lab-student-id', proxyRequest.labStudentId);
        }
    },
    onError: (_error, _req, res) => {
        const response = res as Response;
        if (!response.headersSent) {
            response.status(502).json({ success: false, error: 'Attackbox upstream unavailable' });
        }
    },
});

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'lab-access-proxy',
        basePath: LAB_ACCESS_PROXY_BASE_PATH,
        timestamp: new Date().toISOString(),
    });
});

app.post(mountAuthPath(LAB_ACCESS_PROXY_BASE_PATH), resolveTarget, (req: Request, res: Response) => {
    const sessionCode = String(req.params.sessionCode || '').trim();
    const token = getBearerToken(String(req.headers.authorization || ''))
        || getTokenFromCookie(req)
        || getTokenFromQuery(req);
    if (!sessionCode || !token) {
        res.status(401).json({ success: false, error: 'Missing access token' });
        return;
    }

    setAuthCookie(res, req, sessionCode, token);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
        success: true,
        path: getSessionAttackboxPath(sessionCode),
    });
});

app.use(mountPath(LAB_ACCESS_PROXY_BASE_PATH), resolveTarget, proxy);

app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[lab-access-proxy] listening on ${PORT}`);
});
