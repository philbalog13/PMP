-- Migration 021: Align workshop quiz question counts with pedagogical targets
-- Targets:
--   intro=10, iso8583=16, hsm-keys=12, 3ds-flow=14, fraud-detection=10, emv=12
--
-- Strategy:
--   Build learning.quiz_questions from existing learning.cursus_quiz_questions pools.
--   Refresh only targets for which we have enough source questions.

CREATE TEMP TABLE tmp_workshop_quiz_targets (
    target_quiz_id VARCHAR(80) PRIMARY KEY,
    workshop_id VARCHAR(50) NOT NULL,
    quiz_title VARCHAR(255) NOT NULL,
    pass_percentage INTEGER NOT NULL,
    time_limit_minutes INTEGER,
    target_count INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_workshop_quiz_targets (
    target_quiz_id, workshop_id, quiz_title, pass_percentage, time_limit_minutes, target_count
)
VALUES
    ('quiz-intro', 'intro', 'Quiz - Introduction aux Paiements', 80, 15, 10),
    ('quiz-iso8583', 'iso8583', 'Quiz - ISO 8583', 80, 20, 16),
    ('quiz-hsm', 'hsm-keys', 'Quiz - HSM et Gestion des Cles', 80, 20, 12),
    ('quiz-3ds', '3ds-flow', 'Quiz - 3D Secure', 80, 20, 14),
    ('quiz-fraud', 'fraud-detection', 'Quiz - Detection de Fraude', 80, 15, 10),
    ('quiz-emv', 'emv', 'Quiz - Cartes EMV', 80, 20, 12);

CREATE TEMP TABLE tmp_workshop_quiz_sources (
    target_quiz_id VARCHAR(80) NOT NULL,
    source_quiz_id VARCHAR(80) NOT NULL,
    source_priority INTEGER NOT NULL,
    PRIMARY KEY (target_quiz_id, source_quiz_id)
) ON COMMIT DROP;

INSERT INTO tmp_workshop_quiz_sources (target_quiz_id, source_quiz_id, source_priority)
VALUES
    -- Introduction aux paiements (10)
    ('quiz-intro', 'quiz-2.3-iso8583', 1),
    ('quiz-intro', 'quiz-3.2-switch', 2),

    -- ISO 8583 (16)
    ('quiz-iso8583', 'quiz-2.3-iso8583', 1),
    ('quiz-iso8583', 'quiz-3.4-messaging', 2),
    ('quiz-iso8583', 'quiz-3.2-switch', 3),
    ('quiz-iso8583', 'quiz-3.1-archi', 4),

    -- HSM et gestion des cles (12)
    ('quiz-hsm', 'quiz-3.3-hsm', 1),
    ('quiz-hsm', 'quiz-5.3-crypto', 2),
    ('quiz-hsm', 'quiz-3.5-token', 3),

    -- Flux 3D Secure (14)
    ('quiz-3ds', 'quiz-2.6-3dsecure', 1),
    ('quiz-3ds', 'quiz-2.4-emv', 2),
    ('quiz-3ds', 'quiz-4.2-antifraude', 3),

    -- Detection de fraude (10)
    ('quiz-fraud', 'quiz-4.2-antifraude', 1),
    ('quiz-fraud', 'quiz-4.5-risques', 2),

    -- Cartes EMV (12)
    ('quiz-emv', 'quiz-2.4-emv', 1),
    ('quiz-emv', 'quiz-5.1-contact', 2),
    ('quiz-emv', 'quiz-2.1-iso7816', 3);

CREATE TEMP TABLE tmp_workshop_quiz_eligible (
    target_quiz_id VARCHAR(80) PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO tmp_workshop_quiz_eligible (target_quiz_id)
SELECT t.target_quiz_id
FROM tmp_workshop_quiz_targets t
JOIN (
    SELECT
        s.target_quiz_id,
        COUNT(*)::integer AS available_questions
    FROM tmp_workshop_quiz_sources s
    JOIN learning.cursus_quiz_questions qq
        ON qq.quiz_id = s.source_quiz_id
    GROUP BY s.target_quiz_id
) a
    ON a.target_quiz_id = t.target_quiz_id
WHERE a.available_questions >= t.target_count;

-- Replace previous workshop quiz banks only when enough source questions are available.
DELETE FROM learning.quiz_questions q
USING tmp_workshop_quiz_eligible e
WHERE q.quiz_id = e.target_quiz_id;

WITH pooled AS (
    SELECT
        t.target_quiz_id,
        t.workshop_id,
        t.quiz_title,
        t.pass_percentage,
        t.time_limit_minutes,
        t.target_count,
        s.source_priority,
        qq.id AS source_question_id,
        qq.question AS question_text,
        qq.options,
        qq.correct_option_index,
        COALESCE(qq.explanation, '') AS explanation,
        qq.question_order
    FROM tmp_workshop_quiz_targets t
    JOIN tmp_workshop_quiz_eligible e
        ON e.target_quiz_id = t.target_quiz_id
    JOIN tmp_workshop_quiz_sources s
        ON s.target_quiz_id = t.target_quiz_id
    JOIN learning.cursus_quiz_questions qq
        ON qq.quiz_id = s.source_quiz_id
),
ranked AS (
    SELECT
        p.*,
        ROW_NUMBER() OVER (
            PARTITION BY p.target_quiz_id
            ORDER BY p.source_priority ASC, p.question_order ASC, p.source_question_id ASC
        ) AS target_order
    FROM pooled p
),
limited AS (
    SELECT r.*
    FROM ranked r
    WHERE r.target_order <= r.target_count
)
INSERT INTO learning.quiz_questions (
    quiz_id,
    workshop_id,
    quiz_title,
    pass_percentage,
    time_limit_minutes,
    question_id,
    question_text,
    options,
    correct_option_index,
    explanation,
    question_order
)
SELECT
    l.target_quiz_id AS quiz_id,
    l.workshop_id,
    l.quiz_title,
    l.pass_percentage,
    l.time_limit_minutes,
    l.target_quiz_id || '-q' || LPAD(l.target_order::text, 2, '0') AS question_id,
    l.question_text,
    l.options,
    l.correct_option_index,
    l.explanation,
    l.target_order
FROM limited l
ORDER BY l.target_quiz_id, l.target_order;
