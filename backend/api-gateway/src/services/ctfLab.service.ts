import axios from 'axios';
import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { recordLabStart, recordLabStop, setLabActiveSessions } from './ctfLabMetrics.service';

export type LabSessionStatus = 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'EXPIRED' | 'FAILED';

export interface CtfLabSessionView {
    sessionId: string;
    sessionCode: string;
    status: LabSessionStatus;
    machineIp: string | null;
    attackboxPath: string;
    expiresAt: string;
    timeRemainingSec: number;
    canExtend: boolean;
}

export interface CtfLabTaskView {
    taskId: string;
    title: string;
    hasMachine: boolean;
    questionType: string;
    requiresFlag: boolean;
    points: number;
}

interface LabTemplateRow {
    id: string;
    room_code: string;
    challenge_code: string;
    title: string;
    description: string;
    default_ttl_minutes: number;
    max_extension_minutes: number;
    manifest: any;
}

interface LabSessionRow {
    id: string;
    session_code: string;
    student_id: string;
    challenge_code: string;
    template_id: string;
    status: LabSessionStatus;
    machine_ip: string | null;
    network_name: string | null;
    cidr_block: string | null;
    attackbox_path: string | null;
    attackbox_host: string | null;
    attackbox_port: number | null;
    extension_count: number;
    max_extensions: number;
    started_at: string;
    expires_at: string;
    terminated_at: string | null;
    metadata: any;
}

interface ProvisionRequest {
    sessionId: string;
    sessionCode: string;
    studentId: string;
    challengeCode: string;
    networkName: string;
    cidrBlock: string;
    machineIp: string;
    attackboxPath: string;
    manifest: any;
}

interface ProvisionResponse {
    machineIp?: string;
    attackboxPath?: string;
    attackboxHost?: string;
    attackboxPort?: number;
    instances?: Array<{
        instanceKind: 'ATTACKBOX' | 'TARGET';
        instanceName: string;
        containerId?: string | null;
        image?: string | null;
        internalIp?: string | null;
        accessHost?: string | null;
        accessPort?: number | null;
        metadata?: Record<string, any>;
    }>;
}

export class CtfLabServiceError extends Error {
    statusCode: number;
    code: string;

    constructor(code: string, message: string, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

const ACTIVE_STATUSES: LabSessionStatus[] = ['PROVISIONING', 'RUNNING'];
const SESSION_CODE_PREFIX = 'sess';

const DEFAULT_TTL_MINUTES = parsePositiveInt(process.env.LAB_DEFAULT_TTL_MINUTES, 120);
const DEFAULT_EXTENSION_MINUTES = parsePositiveInt(process.env.LAB_EXTENSION_MINUTES, 60);
const DEFAULT_MAX_EXTENSIONS = parsePositiveInt(process.env.LAB_MAX_EXTENSIONS, 1);
const MAX_ACTIVE_SESSIONS = parsePositiveInt(process.env.LAB_MAX_ACTIVE_SESSIONS, 20);
const NETWORK_BASE_CIDR = process.env.LAB_NETWORK_BASE_CIDR || '10.60.0.0/16';
const NETWORK_SUBNET_PREFIX = parsePositiveInt(process.env.LAB_NETWORK_SUBNET_PREFIX, 28);
const ACCESS_PROXY_BASE_PATH = process.env.LAB_ACCESS_PROXY_BASE_PATH || '/lab';
const ORCHESTRATOR_URL = process.env.LAB_ORCHESTRATOR_URL || '';
const ORCHESTRATOR_SECRET = process.env.LAB_ORCHESTRATOR_SECRET || '';
const ATTACKBOX_HOST_FALLBACK = process.env.LAB_ATTACKBOX_HOST || 'ctf-attackbox';
const ATTACKBOX_PORT_FALLBACK = parsePositiveInt(process.env.LAB_ATTACKBOX_PORT, 7681);
const MAINTENANCE_INTERVAL_MS = parsePositiveInt(process.env.LAB_MAINTENANCE_INTERVAL_MS, 30_000);
const RECONCILE_INTERVAL_MS = parsePositiveInt(process.env.LAB_RECONCILE_INTERVAL_MS, 120_000);
const PROVISIONING_TIMEOUT_MINUTES = parsePositiveInt(process.env.LAB_PROVISIONING_TIMEOUT_MINUTES, 10);

const NETWORK_BASE_PARTS = (() => {
    const [address, prefixRaw] = NETWORK_BASE_CIDR.split('/');
    const prefix = Number(prefixRaw || 16);
    const octets = String(address || '10.60.0.0')
        .split('.')
        .map((entry) => Number(entry));
    if (octets.length !== 4 || octets.some((entry) => !Number.isFinite(entry))) {
        return { o1: 10, o2: 60, prefix: 16 };
    }
    return { o1: octets[0], o2: octets[1], prefix: Number.isFinite(prefix) ? prefix : 16 };
})();

let maintenanceTimer: NodeJS.Timeout | null = null;
let maintenanceInFlight = false;
let lastReconcileRunAt = 0;

function parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

function buildSessionCode(challengeCode: string): string {
    const compact = challengeCode.replace(/[^A-Z0-9]/gi, '').toLowerCase().slice(0, 12);
    return `${SESSION_CODE_PREFIX}-${compact}-${randomUUID().split('-')[0]}`;
}

function normalizeManifest(value: any): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}

function getTimeRemainingSec(expiresAt: string): number {
    const expiresMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
}

function toSessionView(row: LabSessionRow): CtfLabSessionView {
    return {
        sessionId: row.id,
        sessionCode: row.session_code,
        status: row.status,
        machineIp: row.machine_ip,
        attackboxPath: row.attackbox_path || `${ACCESS_PROXY_BASE_PATH}/sessions/${row.session_code}/attackbox`,
        expiresAt: new Date(row.expires_at).toISOString(),
        timeRemainingSec: getTimeRemainingSec(row.expires_at),
        canExtend: row.status === 'RUNNING'
            && row.extension_count < row.max_extensions
            && row.terminated_at === null,
    };
}

function indexToSubnet(index: number): string {
    const thirdOctet = Math.floor(index / 16);
    const fourthOctet = (index % 16) * 16;
    return `${NETWORK_BASE_PARTS.o1}.${NETWORK_BASE_PARTS.o2}.${thirdOctet}.${fourthOctet}/${NETWORK_SUBNET_PREFIX}`;
}

function deriveMachineIp(cidrBlock: string): string {
    const [networkAddress] = cidrBlock.split('/');
    const octets = networkAddress.split('.').map((entry) => Number(entry));
    if (octets.length !== 4 || octets.some((entry) => !Number.isFinite(entry))) {
        return '10.60.0.2';
    }
    return `${octets[0]}.${octets[1]}.${octets[2]}.${octets[3] + 2}`;
}

function buildAttackboxPath(sessionCode: string): string {
    return `${ACCESS_PROXY_BASE_PATH}/sessions/${sessionCode}/attackbox`;
}

async function insertLabEvent(
    sessionId: string | null,
    eventName: string,
    payload: Record<string, any>,
    status: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
): Promise<void> {
    try {
        await query(
            `INSERT INTO learning.ctf_lab_events
                (session_id, event_name, event_status, event_payload)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [sessionId, eventName, status, JSON.stringify(payload || {})]
        );
    } catch (error: any) {
        logger.warn('Failed to persist ctf lab event', {
            sessionId,
            eventName,
            error: error.message,
        });
    }
}

async function callOrchestratorProvision(request: ProvisionRequest): Promise<ProvisionResponse | null> {
    if (!ORCHESTRATOR_URL) {
        return null;
    }

    try {
        const response = await axios.post(
            `${ORCHESTRATOR_URL}/orchestrator/sessions/provision`,
            request,
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-orchestrator-secret': ORCHESTRATOR_SECRET,
                },
            }
        );

        if (!response.data?.success) {
            return null;
        }
        return response.data;
    } catch (error: any) {
        logger.warn('lab orchestrator provision failed; using fallback', { error: error.message });
        return null;
    }
}

async function callOrchestratorTerminate(sessionCode: string): Promise<void> {
    if (!ORCHESTRATOR_URL) {
        return;
    }

    try {
        await axios.delete(
            `${ORCHESTRATOR_URL}/orchestrator/sessions/${encodeURIComponent(sessionCode)}`,
            {
                timeout: 10000,
                headers: {
                    'x-orchestrator-secret': ORCHESTRATOR_SECRET,
                },
            }
        );
    } catch (error: any) {
        logger.warn('lab orchestrator terminate failed', { sessionCode, error: error.message });
    }
}

async function callOrchestratorReconcile(payload: Record<string, any>): Promise<boolean> {
    if (!ORCHESTRATOR_URL) {
        return false;
    }

    try {
        const response = await axios.post(
            `${ORCHESTRATOR_URL}/orchestrator/sessions/reconcile`,
            payload,
            {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-orchestrator-secret': ORCHESTRATOR_SECRET,
                },
            }
        );
        return Boolean(response.data?.success);
    } catch (error: any) {
        logger.warn('lab orchestrator reconcile failed', { error: error.message });
        return false;
    }
}

function buildFallbackProvision(session: LabSessionRow, template: LabTemplateRow): ProvisionResponse {
    const manifest = normalizeManifest(template.manifest);
    const targets = Array.isArray(manifest.targets) ? manifest.targets : [];
    const target = targets[0] || null;
    return {
        machineIp: session.machine_ip || deriveMachineIp(session.cidr_block || '10.60.0.0/28'),
        attackboxPath: session.attackbox_path || buildAttackboxPath(session.session_code),
        attackboxHost: ATTACKBOX_HOST_FALLBACK,
        attackboxPort: ATTACKBOX_PORT_FALLBACK,
        instances: [
            {
                instanceKind: 'ATTACKBOX',
                instanceName: `attackbox-${session.session_code}`,
                image: String(process.env.LAB_ATTACKBOX_CONTAINER_IMAGE || 'pmp-ctf-attackbox'),
                internalIp: null,
                accessHost: ATTACKBOX_HOST_FALLBACK,
                accessPort: ATTACKBOX_PORT_FALLBACK,
                metadata: { fallback: true },
            },
            {
                instanceKind: 'TARGET',
                instanceName: String(target?.name || manifest.entryTarget || template.challenge_code).slice(0, 120),
                image: String(target?.image || process.env.LAB_DEFAULT_TARGET_IMAGE || 'shared-target'),
                internalIp: session.machine_ip || deriveMachineIp(session.cidr_block || '10.60.0.0/28'),
                metadata: { fallback: true },
            },
        ],
    };
}

async function getActiveSessionCount(): Promise<number> {
    const result = await query(
        `SELECT COUNT(*)::INTEGER AS count
         FROM learning.ctf_lab_sessions
         WHERE status = ANY($1::text[])
           AND terminated_at IS NULL`,
        [ACTIVE_STATUSES]
    );
    return Number(result.rows[0]?.count || 0);
}

async function allocateCidrBlock(): Promise<string> {
    const usedResult = await query(
        `SELECT cidr_block::TEXT AS cidr
         FROM learning.ctf_lab_sessions
         WHERE status = ANY($1::text[])
           AND terminated_at IS NULL
           AND cidr_block IS NOT NULL`,
        [ACTIVE_STATUSES]
    );
    const used = new Set<string>(usedResult.rows.map((row) => String(row.cidr)));
    const totalSubnets = 4096;
    const startIndex = Math.floor(Date.now() / 1000) % totalSubnets;

    for (let offset = 0; offset < totalSubnets; offset += 1) {
        const index = (startIndex + offset) % totalSubnets;
        const candidate = indexToSubnet(index);
        if (!used.has(candidate)) {
            return candidate;
        }
    }

    throw new CtfLabServiceError('LAB_CAPACITY_NETWORK_EXHAUSTED', 'No subnet available for new lab sessions', 503);
}

async function ensureTemplateForChallenge(challengeCode: string): Promise<LabTemplateRow> {
    const templateResult = await query(
        `SELECT *
         FROM learning.ctf_lab_templates
         WHERE challenge_code = $1
           AND is_active = true
         LIMIT 1`,
        [challengeCode]
    );
    if (templateResult.rowCount && templateResult.rows[0]) {
        return templateResult.rows[0] as LabTemplateRow;
    }

    const challengeResult = await query(
        `SELECT challenge_code, title, description, target_service, points
         FROM learning.ctf_challenges
         WHERE challenge_code = $1
         LIMIT 1`,
        [challengeCode]
    );

    if (!challengeResult.rowCount || !challengeResult.rows[0]) {
        throw new CtfLabServiceError('LAB_CHALLENGE_NOT_FOUND', `Challenge ${challengeCode} not found`, 404);
    }

    const challenge = challengeResult.rows[0];
    const targetService = String(challenge.target_service || 'target-service');
    const manifest = {
        roomCode: challengeCode,
        ttlMinutes: DEFAULT_TTL_MINUTES,
        entryTarget: targetService,
        targets: [
            {
                name: targetService,
                image: process.env.LAB_DEFAULT_TARGET_IMAGE || 'shared-target',
                internalPort: 80,
            },
        ],
        flagPolicy: 'platform_dynamic',
    };

    const inserted = await query(
        `INSERT INTO learning.ctf_lab_templates (
            room_code,
            challenge_code,
            title,
            description,
            default_ttl_minutes,
            max_extension_minutes,
            manifest,
            is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
         ON CONFLICT (room_code)
         DO UPDATE SET
            challenge_code = EXCLUDED.challenge_code,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            default_ttl_minutes = EXCLUDED.default_ttl_minutes,
            max_extension_minutes = EXCLUDED.max_extension_minutes,
            manifest = EXCLUDED.manifest,
            is_active = true,
            updated_at = NOW()
         RETURNING *`,
        [
            challengeCode,
            challengeCode,
            String(challenge.title || challengeCode),
            String(challenge.description || challengeCode),
            DEFAULT_TTL_MINUTES,
            DEFAULT_EXTENSION_MINUTES,
            JSON.stringify(manifest),
        ]
    );

    await query(
        `INSERT INTO learning.ctf_lab_tasks (
            template_id,
            task_id,
            task_order,
            title,
            has_machine,
            question_type,
            requires_flag,
            points,
            task_payload
        )
        VALUES ($1, $2, 1, $3, true, 'FLAG', true, $4, $5::jsonb)
        ON CONFLICT (template_id, task_id) DO NOTHING`,
        [
            inserted.rows[0].id,
            `${challengeCode}-T1`,
            String(challenge.title || challengeCode),
            Number(challenge.points || 0),
            JSON.stringify({ autoGenerated: true, objective: 'capture_flag' }),
        ]
    );

    return inserted.rows[0] as LabTemplateRow;
}

async function loadTasks(templateId: string): Promise<CtfLabTaskView[]> {
    const tasks = await query(
        `SELECT task_id, title, has_machine, question_type, requires_flag, points
         FROM learning.ctf_lab_tasks
         WHERE template_id = $1
         ORDER BY task_order ASC`,
        [templateId]
    );

    return tasks.rows.map((row) => ({
        taskId: String(row.task_id),
        title: String(row.title),
        hasMachine: Boolean(row.has_machine),
        questionType: String(row.question_type),
        requiresFlag: Boolean(row.requires_flag),
        points: Number(row.points || 0),
    }));
}

async function insertInstances(sessionId: string, provision: ProvisionResponse): Promise<void> {
    if (!Array.isArray(provision.instances) || provision.instances.length === 0) {
        return;
    }

    await query('DELETE FROM learning.ctf_lab_instances WHERE session_id = $1', [sessionId]);

    for (const instance of provision.instances) {
        await query(
            `INSERT INTO learning.ctf_lab_instances (
                session_id,
                instance_kind,
                instance_name,
                container_id,
                image,
                internal_ip,
                access_host,
                access_port,
                status,
                metadata
             )
             VALUES ($1, $2, $3, $4, $5, $6::inet, $7, $8, 'RUNNING', $9::jsonb)`,
            [
                sessionId,
                instance.instanceKind,
                instance.instanceName,
                instance.containerId || null,
                instance.image || null,
                instance.internalIp || null,
                instance.accessHost || null,
                instance.accessPort || null,
                JSON.stringify(instance.metadata || {}),
            ]
        );
    }
}

async function fetchStudentSessionById(studentId: string, sessionId: string): Promise<LabSessionRow | null> {
    const result = await query(
        `SELECT *
         FROM learning.ctf_lab_sessions
         WHERE id = $1
           AND student_id = $2
         LIMIT 1`,
        [sessionId, studentId]
    );
    if (!result.rowCount || !result.rows[0]) {
        return null;
    }
    return result.rows[0] as LabSessionRow;
}

async function fetchActiveSession(studentId: string, challengeCode: string): Promise<LabSessionRow | null> {
    const result = await query(
        `SELECT *
         FROM learning.ctf_lab_sessions
         WHERE student_id = $1
           AND challenge_code = $2
           AND status = ANY($3::text[])
           AND terminated_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [studentId, challengeCode, ACTIVE_STATUSES]
    );
    if (!result.rowCount || !result.rows[0]) {
        return null;
    }
    return result.rows[0] as LabSessionRow;
}

async function markSessionStopped(session: LabSessionRow, status: LabSessionStatus, reason: string): Promise<LabSessionRow> {
    const startedAt = Date.now();
    await callOrchestratorTerminate(session.session_code);
    const updated = await query(
        `UPDATE learning.ctf_lab_sessions
         SET status = $2,
             terminated_at = COALESCE(terminated_at, NOW()),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [session.id, status]
    );

    await query(
        `UPDATE learning.ctf_lab_instances
         SET status = 'STOPPED',
             updated_at = NOW()
         WHERE session_id = $1`,
        [session.id]
    );

    await insertLabEvent(session.id, 'session_terminated', { reason, status }, status === 'EXPIRED' ? 'WARN' : 'INFO');
    recordLabStop(Date.now() - startedAt, true);
    return updated.rows[0] as LabSessionRow;
}

async function markStaleProvisioningSessionsFailed(): Promise<number> {
    const stale = await query(
        `SELECT *
         FROM learning.ctf_lab_sessions
         WHERE status = 'PROVISIONING'
           AND terminated_at IS NULL
           AND started_at <= NOW() - ($1 || ' minutes')::interval`,
        [PROVISIONING_TIMEOUT_MINUTES]
    );

    for (const row of stale.rows) {
        await markSessionStopped(row as LabSessionRow, 'FAILED', 'provisioning_timeout');
    }

    return stale.rowCount || 0;
}

export async function cleanupExpiredLabSessions(): Promise<number> {
    const expired = await query(
        `SELECT *
         FROM learning.ctf_lab_sessions
         WHERE status = ANY($1::text[])
           AND terminated_at IS NULL
           AND expires_at <= NOW()`,
        [ACTIVE_STATUSES]
    );

    for (const row of expired.rows) {
        await markSessionStopped(row as LabSessionRow, 'EXPIRED', 'ttl_expired');
    }

    const activeCount = await getActiveSessionCount();
    setLabActiveSessions(activeCount);
    return expired.rowCount || 0;
}

export async function reconcileLabSessions(): Promise<{
    staleProvisioningFailed: number;
    activeSessions: number;
    orchestratorNotified: boolean;
}> {
    const staleProvisioningFailed = await markStaleProvisioningSessionsFailed();
    const active = await query(
        `SELECT session_code, network_name, cidr_block::TEXT AS cidr_block, machine_ip::TEXT AS machine_ip
         FROM learning.ctf_lab_sessions
         WHERE status = ANY($1::text[])
           AND terminated_at IS NULL`,
        [ACTIVE_STATUSES]
    );

    const sessions = active.rows.map((row) => ({
        sessionCode: String(row.session_code),
        networkName: row.network_name ? String(row.network_name) : null,
        cidrBlock: row.cidr_block ? String(row.cidr_block) : null,
        machineIp: row.machine_ip ? String(row.machine_ip) : null,
    }));

    const orchestratorNotified = await callOrchestratorReconcile({
        generatedAt: new Date().toISOString(),
        activeSessions: sessions,
    });

    const activeSessions = active.rowCount || 0;
    setLabActiveSessions(activeSessions);

    if (staleProvisioningFailed > 0) {
        await insertLabEvent(
            null,
            'stale_provisioning_sessions_failed',
            { count: staleProvisioningFailed, timeoutMinutes: PROVISIONING_TIMEOUT_MINUTES },
            'WARN'
        );
    }

    return { staleProvisioningFailed, activeSessions, orchestratorNotified };
}

export async function startOrReuseLabSession(
    studentId: string,
    challengeCode: string,
    options: { forceNew?: boolean } = {}
): Promise<{ session: CtfLabSessionView; tasks: CtfLabTaskView[] }> {
    await cleanupExpiredLabSessions();

    if (!options.forceNew) {
        const existing = await fetchActiveSession(studentId, challengeCode);
        if (existing) {
            const template = await ensureTemplateForChallenge(challengeCode);
            const tasks = await loadTasks(template.id);
            return { session: toSessionView(existing), tasks };
        }
    }

    const activeCount = await getActiveSessionCount();
    if (activeCount >= MAX_ACTIVE_SESSIONS) {
        throw new CtfLabServiceError(
            'LAB_CAPACITY_EXCEEDED',
            'The platform reached max active lab sessions. Please retry shortly.',
            429
        );
    }

    const template = await ensureTemplateForChallenge(challengeCode);
    const tasks = await loadTasks(template.id);
    const sessionCode = buildSessionCode(challengeCode);
    const cidrBlock = await allocateCidrBlock();
    const machineIp = deriveMachineIp(cidrBlock);
    const networkName = `ctf-sess-${sessionCode}`.slice(0, 120);
    const attackboxPath = buildAttackboxPath(sessionCode);
    const ttlMinutes = Number(template.default_ttl_minutes || DEFAULT_TTL_MINUTES);
    const startedAt = Date.now();

    const inserted = await query(
        `INSERT INTO learning.ctf_lab_sessions (
            session_code,
            student_id,
            challenge_code,
            template_id,
            status,
            machine_ip,
            network_name,
            cidr_block,
            attackbox_path,
            extension_count,
            max_extensions,
            started_at,
            expires_at,
            metadata
         )
         VALUES (
            $1, $2, $3, $4, 'PROVISIONING', $5::inet, $6, $7::cidr, $8, 0, $9, NOW(), NOW() + ($10 || ' minutes')::interval, $11::jsonb
         )
         RETURNING *`,
        [
            sessionCode,
            studentId,
            challengeCode,
            template.id,
            machineIp,
            networkName,
            cidrBlock,
            attackboxPath,
            DEFAULT_MAX_EXTENSIONS,
            ttlMinutes,
            JSON.stringify({ provisioningMode: ORCHESTRATOR_URL ? 'orchestrator' : 'fallback' }),
        ]
    );
    const session = inserted.rows[0] as LabSessionRow;
    await insertLabEvent(session.id, 'session_provisioning_started', { challengeCode, sessionCode });

    let provision = await callOrchestratorProvision({
        sessionId: session.id,
        sessionCode: session.session_code,
        studentId,
        challengeCode,
        networkName,
        cidrBlock,
        machineIp,
        attackboxPath,
        manifest: normalizeManifest(template.manifest),
    });

    if (!provision) {
        provision = buildFallbackProvision(session, template);
    }

    const resolvedMachineIp = provision.machineIp || machineIp;
    const resolvedPath = provision.attackboxPath || attackboxPath;
    const resolvedHost = provision.attackboxHost || ATTACKBOX_HOST_FALLBACK;
    const resolvedPort = Number(provision.attackboxPort || ATTACKBOX_PORT_FALLBACK);

    const updated = await query(
        `UPDATE learning.ctf_lab_sessions
         SET status = 'RUNNING',
             machine_ip = $2::inet,
             attackbox_path = $3,
             attackbox_host = $4,
             attackbox_port = $5,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [session.id, resolvedMachineIp, resolvedPath, resolvedHost, resolvedPort]
    );

    await insertInstances(session.id, provision);
    await insertLabEvent(session.id, 'session_running', {
        machineIp: resolvedMachineIp,
        attackboxPath: resolvedPath,
        attackboxHost: resolvedHost,
        attackboxPort: resolvedPort,
    });

    const finalSession = updated.rows[0] as LabSessionRow;
    recordLabStart(Date.now() - startedAt, true);
    setLabActiveSessions(await getActiveSessionCount());
    return {
        session: toSessionView(finalSession),
        tasks,
    };
}

export async function getLabSessionForChallenge(
    studentId: string,
    challengeCode: string
): Promise<{ session: CtfLabSessionView | null; tasks: CtfLabTaskView[] }> {
    await cleanupExpiredLabSessions();
    const template = await ensureTemplateForChallenge(challengeCode);
    const tasks = await loadTasks(template.id);
    const session = await fetchActiveSession(studentId, challengeCode);
    return {
        session: session ? toSessionView(session) : null,
        tasks,
    };
}

export async function extendLabSession(studentId: string, sessionId: string): Promise<CtfLabSessionView> {
    const session = await fetchStudentSessionById(studentId, sessionId);
    if (!session) {
        throw new CtfLabServiceError('LAB_SESSION_NOT_FOUND', 'Lab session not found', 404);
    }
    if (session.status !== 'RUNNING' || session.terminated_at) {
        throw new CtfLabServiceError('LAB_SESSION_NOT_RUNNING', 'Lab session is not running', 409);
    }
    if (session.extension_count >= session.max_extensions) {
        throw new CtfLabServiceError('LAB_EXTENSION_LIMIT', 'Lab session extension limit reached', 409);
    }

    const updated = await query(
        `UPDATE learning.ctf_lab_sessions
         SET extension_count = extension_count + 1,
             expires_at = expires_at + ($2 || ' minutes')::interval,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [session.id, DEFAULT_EXTENSION_MINUTES]
    );
    await insertLabEvent(session.id, 'session_extended', { extensionMinutes: DEFAULT_EXTENSION_MINUTES });
    return toSessionView(updated.rows[0] as LabSessionRow);
}

export async function terminateLabSession(studentId: string, sessionId: string): Promise<CtfLabSessionView> {
    const session = await fetchStudentSessionById(studentId, sessionId);
    if (!session) {
        throw new CtfLabServiceError('LAB_SESSION_NOT_FOUND', 'Lab session not found', 404);
    }
    if (!ACTIVE_STATUSES.includes(session.status) || session.terminated_at) {
        return toSessionView(session);
    }
    const stopped = await markSessionStopped(session, 'STOPPED', 'manual_terminate');
    setLabActiveSessions(await getActiveSessionCount());
    return toSessionView(stopped);
}

export async function resetLabSession(studentId: string, sessionId: string): Promise<CtfLabSessionView> {
    const session = await fetchStudentSessionById(studentId, sessionId);
    if (!session) {
        throw new CtfLabServiceError('LAB_SESSION_NOT_FOUND', 'Lab session not found', 404);
    }
    if (ACTIVE_STATUSES.includes(session.status) && !session.terminated_at) {
        await markSessionStopped(session, 'STOPPED', 'reset');
    }
    const restarted = await startOrReuseLabSession(studentId, session.challenge_code, { forceNew: true });
    return restarted.session;
}

export async function resolveLabProxyTarget(
    studentId: string,
    sessionCode: string
): Promise<{ targetUrl: string; sessionId: string }> {
    const result = await query(
        `SELECT *
         FROM learning.ctf_lab_sessions
         WHERE session_code = $1
           AND student_id = $2
           AND status = 'RUNNING'
           AND terminated_at IS NULL
           AND expires_at > NOW()
         LIMIT 1`,
        [sessionCode, studentId]
    );
    if (!result.rowCount || !result.rows[0]) {
        throw new CtfLabServiceError('LAB_SESSION_UNAVAILABLE', 'Lab session is unavailable', 404);
    }

    const row = result.rows[0] as LabSessionRow;
    const host = row.attackbox_host || ATTACKBOX_HOST_FALLBACK;
    const port = Number(row.attackbox_port || ATTACKBOX_PORT_FALLBACK);
    return {
        sessionId: row.id,
        targetUrl: `http://${host}:${port}`,
    };
}

export function startLabMaintenanceLoop(): void {
    if (maintenanceTimer) {
        return;
    }
    const runMaintenance = async () => {
        if (maintenanceInFlight) {
            return;
        }

        maintenanceInFlight = true;
        try {
            await cleanupExpiredLabSessions();

            const now = Date.now();
            if (now - lastReconcileRunAt >= RECONCILE_INTERVAL_MS) {
                lastReconcileRunAt = now;
                await reconcileLabSessions();
            }
        } catch (error: any) {
            logger.error('ctf lab maintenance loop failed', { error: error.message });
        } finally {
            maintenanceInFlight = false;
        }
    };

    void runMaintenance();
    maintenanceTimer = setInterval(() => {
        void runMaintenance();
    }, MAINTENANCE_INTERVAL_MS);
}

export function stopLabMaintenanceLoop(): void {
    if (!maintenanceTimer) {
        return;
    }
    clearInterval(maintenanceTimer);
    maintenanceTimer = null;
}
