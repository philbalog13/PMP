import crypto from 'node:crypto';
import { PoolClient } from 'pg';
import { pool, query } from '../config/database';
import {
    CtfLabServiceError,
    CtfLabSessionView,
    extendLabSession,
    getLabSessionForScopeKey,
    resetLabSession,
    startOrReuseLabSessionByTemplate,
    terminateLabSession,
} from './ctfLab.service';

export type UaTaskStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
export type UaUnitStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
const UA_DISABLE_LOCKS = String(process.env.UA_DISABLE_LOCKS || 'false').toLowerCase() === 'true';

interface UaUnitRow {
    id: string;
    module_id: string;
    cursus_id: string;
    unit_code: string;
    title: string;
    summary: string | null;
    room_style: string;
    duration_minutes: number | null;
    content_markdown: string;
    learning_objectives: any;
    validation_checklist: any;
    resources: any;
    unit_order: number;
}

interface UaTaskRow {
    id: string;
    unit_id: string;
    task_code: string | null;
    task_order: number;
    title: string;
    prompt: string | null;
    task_type: string;
    options: any;
    answer_schema: any;
    hints: any;
    points: number;
    is_required: boolean;
}

interface UaUnitProgressRow {
    id: string;
    student_id: string;
    unit_id: string;
    status: UaUnitStatus;
    started_at: string | null;
    completed_at: string | null;
    last_activity_at: string | null;
}

interface UaTaskProgressRow {
    id: string;
    progress_id: string;
    task_id: string;
    task_order: number;
    status: UaTaskStatus;
    attempt_count: number;
    completed_at: string | null;
    last_submission_at: string | null;
}

interface UaLabConfigRow {
    unit_id: string;
    template_id: string;
    is_enabled: boolean;
    auto_start: boolean;
    ttl_override_minutes: number | null;
}

export interface UaTaskDto {
    taskId: string;
    taskCode: string | null;
    taskOrder: number;
    title: string;
    prompt: string | null;
    taskType: string;
    points: number;
    isRequired: boolean;
    status: UaTaskStatus;
    attemptCount: number;
    completedAt: string | null;
    options: any[];
    hints: any[];
    answerSchema: Record<string, any>;
}

export interface UaUnitProgressDto {
    status: UaUnitStatus;
    startedAt: string | null;
    completedAt: string | null;
    lastActivityAt: string | null;
    taskCompleted: number;
    taskTotal: number;
    requiredTaskCompleted: number;
    requiredTaskTotal: number;
}

export interface UaLabSessionDto {
    isEnabled: boolean;
    autoStart: boolean;
    ttlOverrideMinutes: number | null;
    session: CtfLabSessionView | null;
}

export interface UaUnitDetailResponse {
    unitId: string;
    moduleId: string;
    cursusId: string;
    unitCode: string;
    title: string;
    summary: string | null;
    roomStyle: string;
    durationMinutes: number | null;
    contentMarkdown: string;
    learningObjectives: string[];
    validationChecklist: string[];
    resources: string[];
    unitOrder: number;
    progress: UaUnitProgressDto;
    tasks: UaTaskDto[];
    lab: UaLabSessionDto;
}

export interface UaTaskSubmissionResult {
    unitStatus: UaUnitStatus;
    taskId: string;
    taskOrder: number;
    isCorrect: boolean;
    message: string;
    completed: boolean;
    nextTaskId: string | null;
    taskStatus: UaTaskStatus;
    attemptCount: number;
    pointsAwarded: number;
}

export interface UaUnitSummary {
    unitId: string;
    unitCode: string;
    title: string;
    summary: string | null;
    roomStyle: string;
    durationMinutes: number | null;
    unitOrder: number;
    taskTotal: number;
    taskCompleted: number;
    hasLabMachine: boolean;
    status: UaUnitStatus;
}

function toStringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => String(entry || '').trim())
        .filter((entry) => Boolean(entry));
}

function toObject(value: any): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
    }
    return {};
}

function normalizeText(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

function normalizeCompact(value: unknown): string {
    return String(value || '').trim();
}

function normalizeFolded(value: unknown): string {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function hashAnswer(value: unknown): string {
    return crypto
        .createHash('sha256')
        .update(String(value || '').trim())
        .digest('hex');
}

function sessionScopeForUnit(unitId: string): string {
    return `UA::${unitId}`;
}

async function fetchUnit(cursusId: string, moduleId: string, unitId: string): Promise<UaUnitRow> {
    const result = await query(
        `SELECT
            u.id,
            u.module_id,
            m.cursus_id,
            u.unit_code,
            u.title,
            u.summary,
            u.room_style,
            u.duration_minutes,
            u.content_markdown,
            u.learning_objectives,
            u.validation_checklist,
            u.resources,
            u.unit_order
         FROM learning.cursus_units u
         JOIN learning.cursus_modules m ON m.id = u.module_id
         WHERE u.id = $1
           AND u.module_id = $2
           AND m.cursus_id = $3
           AND u.is_published = true
         LIMIT 1`,
        [unitId, moduleId, cursusId]
    );

    if (!result.rowCount || !result.rows[0]) {
        throw new Error('UA_NOT_FOUND');
    }

    return result.rows[0] as UaUnitRow;
}

async function fetchUnitTasks(unitId: string): Promise<UaTaskRow[]> {
    const result = await query(
        `SELECT
            id,
            unit_id,
            task_code,
            task_order,
            title,
            prompt,
            task_type,
            options,
            answer_schema,
            hints,
            points,
            is_required
         FROM learning.cursus_unit_tasks
         WHERE unit_id = $1
         ORDER BY task_order ASC`,
        [unitId]
    );
    return result.rows as UaTaskRow[];
}

async function fetchUnitLabConfig(unitId: string): Promise<UaLabConfigRow | null> {
    const result = await query(
        `SELECT unit_id, template_id, is_enabled, auto_start, ttl_override_minutes
         FROM learning.cursus_unit_lab_config
         WHERE unit_id = $1
           AND is_enabled = true
         LIMIT 1`,
        [unitId]
    );
    return (result.rows[0] as UaLabConfigRow) || null;
}

async function countPendingPreviousUnits(studentId: string, moduleId: string, unitOrder: number): Promise<number> {
    const result = await query(
        `SELECT COUNT(*)::int AS pending
         FROM learning.cursus_units u
         LEFT JOIN learning.cursus_unit_progress p
                ON p.unit_id = u.id
               AND p.student_id = $1
         WHERE u.module_id = $2
           AND u.is_published = true
           AND u.unit_order < $3
           AND (p.status IS NULL OR p.status <> 'COMPLETED')`,
        [studentId, moduleId, unitOrder]
    );
    return Number(result.rows[0]?.pending || 0);
}

async function fetchUnitProgress(studentId: string, unitId: string): Promise<UaUnitProgressRow | null> {
    const result = await query(
        `SELECT id, student_id, unit_id, status, started_at, completed_at, last_activity_at
         FROM learning.cursus_unit_progress
         WHERE student_id = $1
           AND unit_id = $2
         LIMIT 1`,
        [studentId, unitId]
    );
    return (result.rows[0] as UaUnitProgressRow) || null;
}

class UaServiceError extends Error {
    statusCode: number;
    code: string;

    constructor(code: string, message: string, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

interface UaTaskEvaluationResult {
    isCorrect: boolean;
    message: string;
    normalizedAnswer: string;
    metadata: Record<string, any>;
}

function toDbText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function normalizeMode(taskType: string, schema: Record<string, any>): string {
    const explicitMode = normalizeCompact(schema.mode).toUpperCase();
    if (explicitMode) {
        return explicitMode;
    }

    const normalizedType = normalizeCompact(taskType).toUpperCase();
    if (normalizedType === 'QUIZ') return 'QUIZ_SINGLE';
    if (normalizedType === 'READING' || normalizedType === 'CHECKLIST' || normalizedType === 'RESOURCE') return 'MARK_DONE';
    if (normalizedType === 'VALIDATION') return 'FLAG';
    if (normalizedType === 'EXERCISE') return 'FREE_TEXT';
    return 'FREE_TEXT';
}

function extractSubmissionValue(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload;
    }

    const objectPayload = payload as Record<string, unknown>;
    const preferredKeys = [
        'answer',
        'value',
        'text',
        'flag',
        'selectedOptionIndex',
        'optionIndex',
        'done',
    ];

    for (const key of preferredKeys) {
        if (key in objectPayload) {
            return objectPayload[key];
        }
    }

    return payload;
}

function parseOptionIndex(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.floor(value);
    }
    const raw = normalizeCompact(value);
    if (!raw) {
        return null;
    }
    const asNumber = Number(raw);
    if (!Number.isFinite(asNumber)) {
        return null;
    }
    return Math.floor(asNumber);
}

function parseIndexSet(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value
            .map((entry) => Number(entry))
            .filter((entry) => Number.isFinite(entry))
            .map((entry) => Math.floor(entry));
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((entry) => Number(entry.trim()))
            .filter((entry) => Number.isFinite(entry))
            .map((entry) => Math.floor(entry));
    }

    return [];
}

function evaluateByKeywords(schema: Record<string, any>, submittedText: string): UaTaskEvaluationResult {
    const keywords = toStringArray(schema.keywords || schema.requiredKeywords).map((entry) => normalizeFolded(entry));
    if (keywords.length === 0) {
        return {
            isCorrect: normalizeCompact(submittedText).length > 0,
            message: 'Response recorded.',
            normalizedAnswer: submittedText,
            metadata: { mode: 'KEYWORDS', keywords: [], matchedKeywords: [], missingKeywords: [] },
        };
    }

    const normalized = normalizeFolded(submittedText);
    const matchedKeywords = keywords.filter((keyword) => normalized.includes(keyword));
    const requireAll = schema.requireAll !== false;
    const minMatchesFromSchema = Number(schema.minMatches);
    const minMatches = Number.isFinite(minMatchesFromSchema) && minMatchesFromSchema > 0
        ? Math.min(Math.floor(minMatchesFromSchema), keywords.length)
        : (requireAll ? keywords.length : 1);
    const isCorrect = matchedKeywords.length >= minMatches && (!requireAll || matchedKeywords.length === keywords.length);

    return {
        isCorrect,
        message: isCorrect
            ? 'Validation successful.'
            : `Missing keywords: ${keywords.filter((keyword) => !matchedKeywords.includes(keyword)).join(', ') || 'n/a'}`,
        normalizedAnswer: normalizeCompact(submittedText),
        metadata: {
            mode: 'KEYWORDS',
            minMatches,
            requireAll,
            matchedKeywords,
            missingKeywords: keywords.filter((keyword) => !matchedKeywords.includes(keyword)),
        },
    };
}

function evaluateByRegex(schema: Record<string, any>, submittedText: string): UaTaskEvaluationResult {
    const pattern = normalizeCompact(schema.pattern || schema.regex);
    if (!pattern) {
        return {
            isCorrect: false,
            message: 'Regex pattern is not configured for this task.',
            normalizedAnswer: normalizeCompact(submittedText),
            metadata: { mode: 'REGEX', pattern: null },
        };
    }

    const flagsRaw = normalizeCompact(schema.flags || 'i');
    const flags = flagsRaw
        .split('')
        .filter((entry, index, array) => ['i', 'g', 'm', 's', 'u', 'y'].includes(entry) && array.indexOf(entry) === index)
        .join('');

    try {
        const regex = new RegExp(pattern, flags);
        const isCorrect = regex.test(submittedText);
        return {
            isCorrect,
            message: isCorrect ? 'Validation successful.' : 'Submitted value does not match expected format.',
            normalizedAnswer: normalizeCompact(submittedText),
            metadata: { mode: 'REGEX', pattern, flags },
        };
    } catch {
        return {
            isCorrect: false,
            message: 'Regex configuration is invalid for this task.',
            normalizedAnswer: normalizeCompact(submittedText),
            metadata: { mode: 'REGEX', pattern, flags, invalidRegex: true },
        };
    }
}

function evaluateByFlag(schema: Record<string, any>, submittedText: string): UaTaskEvaluationResult {
    const submitted = normalizeCompact(submittedText);
    const acceptedFlags = [
        normalizeCompact(schema.expectedFlag),
        normalizeCompact(schema.expected),
        normalizeCompact(schema.flag),
        ...toStringArray(schema.acceptedFlags),
    ].filter(Boolean);

    const caseInsensitive = Boolean(schema.caseInsensitive);
    const normalizedSubmitted = caseInsensitive ? submitted.toLowerCase() : submitted;
    const normalizedAccepted = acceptedFlags.map((entry) => (caseInsensitive ? entry.toLowerCase() : entry));

    let isCorrect = normalizedAccepted.length > 0
        ? normalizedAccepted.includes(normalizedSubmitted)
        : false;

    if (!isCorrect && normalizeCompact(schema.pattern || schema.regex)) {
        const regexResult = evaluateByRegex(schema, submitted);
        isCorrect = regexResult.isCorrect;
    }

    if (!isCorrect && normalizedAccepted.length === 0) {
        isCorrect = submitted.length > 0;
    }

    return {
        isCorrect,
        message: isCorrect ? 'Flag accepted.' : 'Incorrect flag submitted.',
        normalizedAnswer: submitted,
        metadata: {
            mode: 'FLAG',
            caseInsensitive,
            acceptedCount: normalizedAccepted.length,
        },
    };
}

function evaluateByQuiz(schema: Record<string, any>, payload: unknown): UaTaskEvaluationResult {
    const payloadValue = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : null;
    const selectedIndex = parseOptionIndex(
        payloadValue
            ? (payloadValue.selectedOptionIndex ?? payloadValue.optionIndex ?? payloadValue.answer)
            : payload
    );
    const multipleSelected = payloadValue
        ? parseIndexSet(payloadValue.selectedOptionIndexes ?? payloadValue.optionIndexes ?? payloadValue.answers)
        : [];

    const correctSingle = parseOptionIndex(schema.correctOptionIndex);
    const correctMultiple = parseIndexSet(schema.correctOptionIndexes || schema.correctAnswers);
    const mode = normalizeCompact(schema.mode).toUpperCase();

    if (correctSingle === null && correctMultiple.length === 0) {
        const hasSubmission = selectedIndex !== null || multipleSelected.length > 0;
        return {
            isCorrect: hasSubmission,
            message: hasSubmission ? 'Answer recorded.' : 'Select at least one option.',
            normalizedAnswer: hasSubmission
                ? (selectedIndex !== null ? String(selectedIndex) : JSON.stringify(multipleSelected))
                : '',
            metadata: {
                mode: 'QUIZ_UNCONFIGURED',
                selectedIndex,
                selectedIndexes: multipleSelected,
            },
        };
    }

    if (mode === 'QUIZ_MULTIPLE' || correctMultiple.length > 0) {
        const expected = [...correctMultiple].sort((a, b) => a - b);
        const submitted = [...multipleSelected].sort((a, b) => a - b);
        const isCorrect = expected.length > 0
            && expected.length === submitted.length
            && expected.every((entry, index) => entry === submitted[index]);
        return {
            isCorrect,
            message: isCorrect ? 'Correct answer.' : 'Incorrect answer.',
            normalizedAnswer: JSON.stringify(submitted),
            metadata: {
                mode: 'QUIZ_MULTIPLE',
                selectedIndexes: submitted,
            },
        };
    }

    if (selectedIndex === null || correctSingle === null) {
        return {
            isCorrect: false,
            message: 'Selected option is missing.',
            normalizedAnswer: selectedIndex === null ? '' : String(selectedIndex),
            metadata: { mode: 'QUIZ_SINGLE', selectedIndex },
        };
    }

    const isCorrect = selectedIndex === correctSingle;
    return {
        isCorrect,
        message: isCorrect ? 'Correct answer.' : 'Incorrect answer.',
        normalizedAnswer: String(selectedIndex),
        metadata: { mode: 'QUIZ_SINGLE', selectedIndex },
    };
}

function evaluateByExactMatch(schema: Record<string, any>, submittedText: string): UaTaskEvaluationResult {
    const acceptedAnswers = [
        normalizeCompact(schema.expectedAnswer),
        normalizeCompact(schema.expected),
        normalizeCompact(schema.value),
        ...toStringArray(schema.acceptedAnswers),
    ].filter(Boolean);

    const caseInsensitive = schema.caseInsensitive !== false;
    const submitted = normalizeCompact(submittedText);
    const normalizedSubmitted = caseInsensitive ? submitted.toLowerCase() : submitted;
    const normalizedAccepted = acceptedAnswers.map((entry) => (caseInsensitive ? entry.toLowerCase() : entry));
    const isCorrect = normalizedAccepted.includes(normalizedSubmitted);

    return {
        isCorrect,
        message: isCorrect ? 'Validation successful.' : 'Incorrect value.',
        normalizedAnswer: submitted,
        metadata: { mode: 'EXACT', acceptedCount: normalizedAccepted.length, caseInsensitive },
    };
}

function evaluateTaskAnswer(task: UaTaskRow, submissionPayload: unknown): UaTaskEvaluationResult {
    const schema = toObject(task.answer_schema);
    const mode = normalizeMode(task.task_type, schema);
    const value = extractSubmissionValue(submissionPayload);
    const submittedText = toDbText(value);

    if (mode === 'MARK_DONE') {
        const doneValue = value === undefined ? true : Boolean(value);
        return {
            isCorrect: doneValue,
            message: doneValue ? 'Task marked as completed.' : 'Task not marked as completed.',
            normalizedAnswer: doneValue ? 'done' : '',
            metadata: { mode: 'MARK_DONE' },
        };
    }

    if (mode === 'QUIZ_SINGLE' || mode === 'QUIZ_MULTIPLE') {
        return evaluateByQuiz(schema, submissionPayload);
    }

    if (mode === 'FLAG') {
        return evaluateByFlag(schema, submittedText);
    }

    if (mode === 'KEYWORDS') {
        return evaluateByKeywords(schema, submittedText);
    }

    if (mode === 'REGEX') {
        return evaluateByRegex(schema, submittedText);
    }

    if (mode === 'EXACT') {
        return evaluateByExactMatch(schema, submittedText);
    }

    if (mode === 'FREE_TEXT' || mode === 'TEXT') {
        const minLength = Number(schema.minLength || 1);
        const normalized = normalizeCompact(submittedText);
        const isCorrect = normalized.length >= Math.max(1, Math.floor(minLength));
        return {
            isCorrect,
            message: isCorrect ? 'Response accepted.' : `Response must contain at least ${minLength} characters.`,
            normalizedAnswer: normalized,
            metadata: { mode: 'FREE_TEXT', minLength: Math.max(1, Math.floor(minLength)) },
        };
    }

    if (mode === 'AUTO') {
        return {
            isCorrect: normalizeCompact(submittedText).length > 0,
            message: 'Response recorded.',
            normalizedAnswer: normalizeCompact(submittedText),
            metadata: { mode: 'AUTO' },
        };
    }

    if (normalizeCompact(schema.expectedAnswer) || toStringArray(schema.acceptedAnswers).length > 0) {
        return evaluateByExactMatch(schema, submittedText);
    }
    if (normalizeCompact(schema.pattern || schema.regex)) {
        return evaluateByRegex(schema, submittedText);
    }
    if (toStringArray(schema.keywords).length > 0) {
        return evaluateByKeywords(schema, submittedText);
    }

    const fallback = normalizeCompact(submittedText);
    return {
        isCorrect: fallback.length > 0,
        message: fallback.length > 0 ? 'Response accepted.' : 'Answer is required.',
        normalizedAnswer: fallback,
        metadata: { mode: 'FREE_TEXT_FALLBACK' },
    };
}

async function fetchTaskProgressRows(progressId: string, client?: PoolClient): Promise<UaTaskProgressRow[]> {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT id, progress_id, task_id, task_order, status, attempt_count, completed_at, last_submission_at
         FROM learning.cursus_unit_task_progress
         WHERE progress_id = $1
         ORDER BY task_order ASC`,
        [progressId]
    );
    return result.rows as UaTaskProgressRow[];
}

async function seedTaskProgressRows(
    progressId: string,
    tasks: UaTaskRow[],
    client?: PoolClient
): Promise<void> {
    if (tasks.length === 0) {
        return;
    }

    const executor = client ?? pool;
    for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        await executor.query(
            `INSERT INTO learning.cursus_unit_task_progress
                (progress_id, task_id, task_order, status)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (progress_id, task_id) DO NOTHING`,
            [progressId, task.id, task.task_order, UA_DISABLE_LOCKS || index === 0 ? 'UNLOCKED' : 'LOCKED']
        );
    }
}

async function ensureUnitProgressRow(
    studentId: string,
    unitId: string,
    requestedStatus: UaUnitStatus,
    client?: PoolClient
): Promise<UaUnitProgressRow> {
    const executor = client ?? pool;
    const result = await executor.query(
        `INSERT INTO learning.cursus_unit_progress
            (student_id, unit_id, status, started_at, last_activity_at)
         VALUES (
            $1,
            $2,
            $3::text,
            CASE WHEN $3::text IN ('IN_PROGRESS', 'COMPLETED') THEN NOW() ELSE NULL END,
            NOW()
         )
         ON CONFLICT (student_id, unit_id)
         DO UPDATE SET
            status = CASE
                WHEN learning.cursus_unit_progress.status = 'COMPLETED' THEN 'COMPLETED'
                WHEN EXCLUDED.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
                ELSE learning.cursus_unit_progress.status
            END,
            started_at = COALESCE(learning.cursus_unit_progress.started_at, NOW()),
            last_activity_at = NOW(),
            updated_at = NOW()
         RETURNING id, student_id, unit_id, status, started_at, completed_at, last_activity_at`,
        [studentId, unitId, requestedStatus]
    );
    return result.rows[0] as UaUnitProgressRow;
}

function buildTaskStatusMap(
    tasks: UaTaskRow[],
    taskProgressRows: UaTaskProgressRow[] | null,
    unitStatus: UaUnitStatus
): Map<string, UaTaskProgressRow> {
    const map = new Map<string, UaTaskProgressRow>();
    if (taskProgressRows) {
        for (const row of taskProgressRows) {
            map.set(row.task_id, row);
        }
        return map;
    }

    tasks.forEach((task, index) => {
        const pseudoStatus: UaTaskStatus = unitStatus === 'LOCKED'
            ? 'LOCKED'
            : index === 0
                ? 'UNLOCKED'
                : 'LOCKED';
        map.set(task.id, {
            id: '',
            progress_id: '',
            task_id: task.id,
            task_order: task.task_order,
            status: pseudoStatus,
            attempt_count: 0,
            completed_at: null,
            last_submission_at: null,
        });
    });
    return map;
}

function buildProgressDto(
    progressRow: UaUnitProgressRow | null,
    effectiveStatus: UaUnitStatus,
    tasks: UaTaskRow[],
    taskProgressRows: UaTaskProgressRow[] | null
): UaUnitProgressDto {
    const taskTotal = tasks.length;
    const requiredTaskTotal = tasks.filter((task) => task.is_required).length;
    const taskMap = buildTaskStatusMap(tasks, taskProgressRows, effectiveStatus);

    let taskCompleted = 0;
    let requiredTaskCompleted = 0;
    for (const task of tasks) {
        const status = taskMap.get(task.id)?.status || 'LOCKED';
        if (status === 'COMPLETED') {
            taskCompleted += 1;
            if (task.is_required) {
                requiredTaskCompleted += 1;
            }
        }
    }

    return {
        status: effectiveStatus,
        startedAt: progressRow?.started_at || null,
        completedAt: progressRow?.completed_at || null,
        lastActivityAt: progressRow?.last_activity_at || null,
        taskCompleted,
        taskTotal,
        requiredTaskCompleted,
        requiredTaskTotal,
    };
}

function toTaskDto(task: UaTaskRow, progressMap: Map<string, UaTaskProgressRow>, fallbackStatus: UaTaskStatus): UaTaskDto {
    const progress = progressMap.get(task.id);
    return {
        taskId: task.id,
        taskCode: task.task_code,
        taskOrder: task.task_order,
        title: task.title,
        prompt: task.prompt,
        taskType: task.task_type,
        points: Number(task.points || 0),
        isRequired: Boolean(task.is_required),
        status: progress?.status || fallbackStatus,
        attemptCount: Number(progress?.attempt_count || 0),
        completedAt: progress?.completed_at || null,
        options: Array.isArray(task.options) ? task.options : [],
        hints: Array.isArray(task.hints) ? task.hints : [],
        answerSchema: toObject(task.answer_schema),
    };
}

function toUnitStatusFromProgress(
    progressRow: UaUnitProgressRow | null,
    isLockedByOrder: boolean
): UaUnitStatus {
    if (progressRow?.status) {
        return progressRow.status;
    }
    return isLockedByOrder ? 'LOCKED' : 'UNLOCKED';
}

function mapLabServiceError(error: unknown): never {
    if (error instanceof CtfLabServiceError) {
        throw new UaServiceError(error.code, error.message, error.statusCode);
    }
    throw error;
}

export async function getUaUnitDetail(
    studentId: string,
    cursusId: string,
    moduleId: string,
    unitId: string
): Promise<UaUnitDetailResponse> {
    const [unit, tasks, labConfig] = await Promise.all([
        fetchUnit(cursusId, moduleId, unitId),
        fetchUnitTasks(unitId),
        fetchUnitLabConfig(unitId),
    ]);

    const [progressRow, pendingPreviousUnits] = await Promise.all([
        fetchUnitProgress(studentId, unitId),
        countPendingPreviousUnits(studentId, moduleId, unit.unit_order),
    ]);
    const lockedByOrder = !UA_DISABLE_LOCKS
        && pendingPreviousUnits > 0
        && progressRow?.status !== 'COMPLETED';

    let taskProgressRows: UaTaskProgressRow[] | null = null;
    if (progressRow) {
        await seedTaskProgressRows(progressRow.id, tasks);
        taskProgressRows = await fetchTaskProgressRows(progressRow.id);
    }

    const effectiveStatus = toUnitStatusFromProgress(progressRow, lockedByOrder);
    const taskProgressMap = buildTaskStatusMap(tasks, taskProgressRows, effectiveStatus);
    const taskFallbackStatus: UaTaskStatus = effectiveStatus === 'LOCKED' ? 'LOCKED' : 'UNLOCKED';
    const taskDtos = tasks.map((task) => toTaskDto(task, taskProgressMap, taskFallbackStatus));
    const progressDto = buildProgressDto(progressRow, effectiveStatus, tasks, taskProgressRows);

    let session: CtfLabSessionView | null = null;
    if (labConfig?.is_enabled) {
        try {
            session = await getLabSessionForScopeKey(studentId, sessionScopeForUnit(unitId));
        } catch (error) {
            mapLabServiceError(error);
        }
    }

    return {
        unitId: unit.id,
        moduleId: unit.module_id,
        cursusId: unit.cursus_id,
        unitCode: unit.unit_code,
        title: unit.title,
        summary: unit.summary,
        roomStyle: unit.room_style,
        durationMinutes: unit.duration_minutes,
        contentMarkdown: unit.content_markdown || '',
        learningObjectives: toStringArray(unit.learning_objectives),
        validationChecklist: toStringArray(unit.validation_checklist),
        resources: toStringArray(unit.resources),
        unitOrder: unit.unit_order,
        progress: progressDto,
        tasks: taskDtos,
        lab: {
            isEnabled: Boolean(labConfig?.is_enabled),
            autoStart: Boolean(labConfig?.auto_start),
            ttlOverrideMinutes: labConfig?.ttl_override_minutes ?? null,
            session,
        },
    };
}

export async function startUaUnit(
    studentId: string,
    cursusId: string,
    moduleId: string,
    unitId: string
): Promise<UaUnitDetailResponse> {
    const [unit, tasks, labConfig] = await Promise.all([
        fetchUnit(cursusId, moduleId, unitId),
        fetchUnitTasks(unitId),
        fetchUnitLabConfig(unitId),
    ]);
    const pendingPreviousUnits = await countPendingPreviousUnits(studentId, moduleId, unit.unit_order);
    if (!UA_DISABLE_LOCKS && pendingPreviousUnits > 0) {
        throw new UaServiceError(
            'UA_LOCKED',
            'Complete previous units before starting this unit.',
            409
        );
    }

    const progressRow = await ensureUnitProgressRow(studentId, unitId, 'IN_PROGRESS');
    await seedTaskProgressRows(progressRow.id, tasks);
    await query(
        `UPDATE learning.cursus_unit_progress
         SET status = CASE WHEN status = 'COMPLETED' THEN status ELSE 'IN_PROGRESS' END,
             started_at = COALESCE(started_at, NOW()),
             last_activity_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [progressRow.id]
    );

    if (labConfig?.is_enabled) {
        const uaChallengeCode = (`UA-${unit.unit_code || unit.id}`)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 30) || 'UA';
        try {
            await startOrReuseLabSessionByTemplate(
                studentId,
                labConfig.template_id,
                sessionScopeForUnit(unitId),
                {
                    flowSource: 'UA',
                    isolationMode: 'DEDICATED_FULL',
                    ttlMinutesOverride: labConfig.ttl_override_minutes,
                    fallbackOnProvisionFailure: false,
                    sessionMetadata: {
                        source: 'cursus_ua',
                        unitId,
                        moduleId,
                        cursusId,
                    },
                    challengeCode: uaChallengeCode,
                }
            );
        } catch (error) {
            mapLabServiceError(error);
        }
    }

    return getUaUnitDetail(studentId, cursusId, moduleId, unitId);
}

async function ensureUnitAndTaskContext(
    studentId: string,
    cursusId: string,
    moduleId: string,
    unitId: string,
    taskId: string,
    client: PoolClient
): Promise<{
    unit: UaUnitRow;
    tasks: UaTaskRow[];
    targetTask: UaTaskRow;
    progressRow: UaUnitProgressRow;
    taskProgressRows: UaTaskProgressRow[];
}> {
    const unit = await fetchUnit(cursusId, moduleId, unitId);
    const tasks = await fetchUnitTasks(unit.id);
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) {
        throw new UaServiceError('UA_TASK_NOT_FOUND', 'Task not found in this unit.', 404);
    }

    const pendingPreviousUnits = await countPendingPreviousUnits(studentId, moduleId, unit.unit_order);
    if (!UA_DISABLE_LOCKS && pendingPreviousUnits > 0) {
        throw new UaServiceError('UA_LOCKED', 'Complete previous units before submitting this task.', 409);
    }

    const progressRow = await ensureUnitProgressRow(studentId, unit.id, 'IN_PROGRESS', client);
    await seedTaskProgressRows(progressRow.id, tasks, client);
    const taskProgressRows = await fetchTaskProgressRows(progressRow.id, client);

    return {
        unit,
        tasks,
        targetTask,
        progressRow,
        taskProgressRows,
    };
}

async function computeUnitCompletionStats(
    progressId: string,
    client: PoolClient
): Promise<{
    total: number;
    completed: number;
    requiredTotal: number;
    requiredCompleted: number;
}> {
    const result = await client.query(
        `SELECT
            COUNT(t.id)::int AS total,
            COUNT(t.id) FILTER (WHERE tp.status = 'COMPLETED')::int AS completed,
            COUNT(t.id) FILTER (WHERE t.is_required = true)::int AS required_total,
            COUNT(t.id) FILTER (WHERE t.is_required = true AND tp.status = 'COMPLETED')::int AS required_completed
         FROM learning.cursus_unit_task_progress tp
         JOIN learning.cursus_unit_tasks t ON t.id = tp.task_id
         WHERE tp.progress_id = $1`,
        [progressId]
    );

    return {
        total: Number(result.rows[0]?.total || 0),
        completed: Number(result.rows[0]?.completed || 0),
        requiredTotal: Number(result.rows[0]?.required_total || 0),
        requiredCompleted: Number(result.rows[0]?.required_completed || 0),
    };
}

export async function submitUaTask(
    studentId: string,
    cursusId: string,
    moduleId: string,
    unitId: string,
    taskId: string,
    submissionPayload: unknown
): Promise<UaTaskSubmissionResult> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const context = await ensureUnitAndTaskContext(
            studentId,
            cursusId,
            moduleId,
            unitId,
            taskId,
            client
        );

        const taskProgressMap = new Map<string, UaTaskProgressRow>();
        context.taskProgressRows.forEach((row) => taskProgressMap.set(row.task_id, row));
        const targetProgressRow = taskProgressMap.get(context.targetTask.id);
        if (!targetProgressRow) {
            throw new UaServiceError('UA_TASK_PROGRESS_MISSING', 'Task progress could not be initialized.', 500);
        }

        const blockingTask = UA_DISABLE_LOCKS
            ? null
            : context.tasks.find((task) => {
                if (task.task_order >= context.targetTask.task_order) {
                    return false;
                }
                const previousProgress = taskProgressMap.get(task.id);
                return previousProgress?.status !== 'COMPLETED';
            });
        if (blockingTask) {
            throw new UaServiceError(
                'UA_TASK_LOCKED',
                `Complete previous task before submitting "${context.targetTask.title}".`,
                409
            );
        }

        if (targetProgressRow.status === 'COMPLETED') {
            const stats = await computeUnitCompletionStats(context.progressRow.id, client);
            const unitStatus: UaUnitStatus = stats.requiredTotal === 0 || stats.requiredCompleted >= stats.requiredTotal
                ? 'COMPLETED'
                : 'IN_PROGRESS';
            await client.query(
                `UPDATE learning.cursus_unit_progress
                 SET status = $2::text,
                     last_activity_at = NOW(),
                     completed_at = CASE WHEN $2::text = 'COMPLETED' THEN COALESCE(completed_at, NOW()) ELSE NULL END,
                     updated_at = NOW()
                 WHERE id = $1`,
                [context.progressRow.id, unitStatus]
            );

            await client.query('COMMIT');
            return {
                unitStatus,
                taskId: context.targetTask.id,
                taskOrder: context.targetTask.task_order,
                isCorrect: true,
                message: 'Task already completed.',
                completed: true,
                nextTaskId: null,
                taskStatus: 'COMPLETED',
                attemptCount: Number(targetProgressRow.attempt_count || 0),
                pointsAwarded: 0,
            };
        }

        const evaluation = evaluateTaskAnswer(context.targetTask, submissionPayload);
        const pointsAwarded = evaluation.isCorrect ? Number(context.targetTask.points || 0) : 0;

        const progressUpdateResult = await client.query(
            `UPDATE learning.cursus_unit_task_progress
             SET status = $2::text,
                 attempt_count = attempt_count + 1,
                 completed_at = CASE
                    WHEN $2::text = 'COMPLETED' THEN COALESCE(completed_at, NOW())
                    ELSE completed_at
                 END,
                 last_submission_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING id, progress_id, task_id, task_order, status, attempt_count, completed_at, last_submission_at`,
            [
                targetProgressRow.id,
                evaluation.isCorrect ? 'COMPLETED' : 'IN_PROGRESS',
            ]
        );

        const updatedTargetProgress = progressUpdateResult.rows[0] as UaTaskProgressRow;
        await client.query(
            `INSERT INTO learning.cursus_unit_task_submissions
                (progress_id, task_id, submitted_answer, submitted_answer_hash, is_correct, points_awarded, feedback, metadata)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
            [
                context.progressRow.id,
                context.targetTask.id,
                toDbText(extractSubmissionValue(submissionPayload)),
                hashAnswer(evaluation.normalizedAnswer),
                evaluation.isCorrect,
                pointsAwarded,
                evaluation.message,
                JSON.stringify({
                    taskType: context.targetTask.task_type,
                    mode: normalizeMode(context.targetTask.task_type, toObject(context.targetTask.answer_schema)),
                    ...evaluation.metadata,
                }),
            ]
        );

        let nextTaskId: string | null = null;
        if (evaluation.isCorrect) {
            const nextTask = context.tasks
                .filter((task) => task.task_order > context.targetTask.task_order)
                .sort((left, right) => left.task_order - right.task_order)[0];
            if (nextTask) {
                nextTaskId = nextTask.id;
                await client.query(
                    `UPDATE learning.cursus_unit_task_progress
                     SET status = 'UNLOCKED',
                         updated_at = NOW()
                     WHERE progress_id = $1
                       AND task_id = $2
                       AND status = 'LOCKED'`,
                    [context.progressRow.id, nextTask.id]
                );
            }
        }

        const stats = await computeUnitCompletionStats(context.progressRow.id, client);
        const unitStatus: UaUnitStatus = stats.requiredTotal === 0 || stats.requiredCompleted >= stats.requiredTotal
            ? 'COMPLETED'
            : 'IN_PROGRESS';
        await client.query(
            `UPDATE learning.cursus_unit_progress
             SET status = $2::text,
                 started_at = COALESCE(started_at, NOW()),
                 completed_at = CASE
                    WHEN $2::text = 'COMPLETED' THEN COALESCE(completed_at, NOW())
                    ELSE NULL
                 END,
                 last_activity_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [context.progressRow.id, unitStatus]
        );

        await client.query('COMMIT');
        return {
            unitStatus,
            taskId: context.targetTask.id,
            taskOrder: context.targetTask.task_order,
            isCorrect: evaluation.isCorrect,
            message: evaluation.message,
            completed: updatedTargetProgress.status === 'COMPLETED',
            nextTaskId,
            taskStatus: updatedTargetProgress.status,
            attemptCount: Number(updatedTargetProgress.attempt_count || 0),
            pointsAwarded,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        if (error instanceof UaServiceError) {
            throw error;
        }
        throw error;
    } finally {
        client.release();
    }
}

interface UaLabSessionRow {
    id: string;
    student_id: string;
    session_scope_key: string;
    flow_source: string;
}

async function assertUaSessionOwnership(
    studentId: string,
    unitId: string,
    sessionId: string
): Promise<UaLabSessionRow> {
    const result = await query(
        `SELECT id, student_id, session_scope_key, flow_source
         FROM learning.ctf_lab_sessions
         WHERE id = $1
           AND student_id = $2
           AND session_scope_key = $3
           AND flow_source = 'UA'
         LIMIT 1`,
        [sessionId, studentId, sessionScopeForUnit(unitId)]
    );

    if (!result.rowCount || !result.rows[0]) {
        throw new UaServiceError('UA_LAB_SESSION_NOT_FOUND', 'UA lab session not found.', 404);
    }

    return result.rows[0] as UaLabSessionRow;
}

export async function getUaUnitSession(
    studentId: string,
    cursusId: string,
    moduleId: string,
    unitId: string
): Promise<CtfLabSessionView | null> {
    await fetchUnit(cursusId, moduleId, unitId);
    const labConfig = await fetchUnitLabConfig(unitId);
    if (!labConfig || !labConfig.is_enabled) {
        return null;
    }

    try {
        return await getLabSessionForScopeKey(studentId, sessionScopeForUnit(unitId));
    } catch (error) {
        mapLabServiceError(error);
    }
}

export async function extendUaLabSession(
    studentId: string,
    unitId: string,
    sessionId: string
): Promise<CtfLabSessionView> {
    await assertUaSessionOwnership(studentId, unitId, sessionId);
    try {
        return await extendLabSession(studentId, sessionId);
    } catch (error) {
        mapLabServiceError(error);
    }
}

export async function resetUaLabSession(
    studentId: string,
    unitId: string,
    sessionId: string
): Promise<CtfLabSessionView> {
    await assertUaSessionOwnership(studentId, unitId, sessionId);
    try {
        return await resetLabSession(studentId, sessionId);
    } catch (error) {
        mapLabServiceError(error);
    }
}

export async function terminateUaLabSession(
    studentId: string,
    unitId: string,
    sessionId: string
): Promise<CtfLabSessionView> {
    await assertUaSessionOwnership(studentId, unitId, sessionId);
    try {
        return await terminateLabSession(studentId, sessionId);
    } catch (error) {
        mapLabServiceError(error);
    }
}

interface ModuleUaSummaryRow {
    unit_id: string;
    unit_code: string;
    title: string;
    summary: string | null;
    room_style: string;
    duration_minutes: number | null;
    unit_order: number;
    task_total: number;
    task_completed: number;
    has_lab_machine: boolean;
    progress_status: UaUnitStatus | null;
}

export async function getModuleUaSummary(studentId: string, moduleId: string): Promise<UaUnitSummary[]> {
    const result = await query(
        `WITH task_stats AS (
            SELECT
                t.unit_id,
                COUNT(*)::int AS task_total
            FROM learning.cursus_unit_tasks t
            GROUP BY t.unit_id
        ),
        student_task_stats AS (
            SELECT
                p.unit_id,
                COUNT(*) FILTER (WHERE tp.status = 'COMPLETED')::int AS task_completed
            FROM learning.cursus_unit_progress p
            JOIN learning.cursus_unit_task_progress tp ON tp.progress_id = p.id
            WHERE p.student_id = $1
            GROUP BY p.unit_id
        )
        SELECT
            u.id AS unit_id,
            u.unit_code,
            u.title,
            u.summary,
            u.room_style,
            u.duration_minutes,
            u.unit_order,
            COALESCE(ts.task_total, 0)::int AS task_total,
            COALESCE(sts.task_completed, 0)::int AS task_completed,
            (lc.unit_id IS NOT NULL) AS has_lab_machine,
            p.status AS progress_status
        FROM learning.cursus_units u
        LEFT JOIN task_stats ts ON ts.unit_id = u.id
        LEFT JOIN student_task_stats sts ON sts.unit_id = u.id
        LEFT JOIN learning.cursus_unit_lab_config lc
               ON lc.unit_id = u.id
              AND lc.is_enabled = true
        LEFT JOIN learning.cursus_unit_progress p
               ON p.unit_id = u.id
              AND p.student_id = $1
        WHERE u.module_id = $2
          AND u.is_published = true
        ORDER BY u.unit_order ASC`,
        [studentId, moduleId]
    );

    const rows = result.rows as ModuleUaSummaryRow[];
    const summaries: UaUnitSummary[] = [];
    let hasBlockingUnit = false;

    for (const row of rows) {
        let status: UaUnitStatus;
        if (row.progress_status) {
            status = row.progress_status;
        } else {
            status = UA_DISABLE_LOCKS ? 'UNLOCKED' : (hasBlockingUnit ? 'LOCKED' : 'UNLOCKED');
        }

        summaries.push({
            unitId: row.unit_id,
            unitCode: row.unit_code,
            title: row.title,
            summary: row.summary,
            roomStyle: row.room_style,
            durationMinutes: row.duration_minutes,
            unitOrder: row.unit_order,
            taskTotal: Number(row.task_total || 0),
            taskCompleted: Number(row.task_completed || 0),
            hasLabMachine: Boolean(row.has_lab_machine),
            status,
        });

        if (!UA_DISABLE_LOCKS && status !== 'COMPLETED') {
            hasBlockingUnit = true;
        }
    }

    return summaries;
}

export function mapUaError(error: unknown): UaServiceError {
    if (error instanceof UaServiceError) {
        return error;
    }
    if (error instanceof CtfLabServiceError) {
        return new UaServiceError(error.code, error.message, error.statusCode);
    }
    if (error instanceof Error && error.message === 'UA_NOT_FOUND') {
        return new UaServiceError('UA_NOT_FOUND', 'Unit not found.', 404);
    }
    return new UaServiceError('UA_INTERNAL_ERROR', 'Internal UA service error.', 500);
}
