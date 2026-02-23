-- Migration 022: Backfill BLOC 1 cursus quiz questions when question banks are empty.
--
-- Context:
--   Some environments have BLOC 1 quizzes (quiz-1.1 ... quiz-1.6, quiz-final-bloc1)
--   created without rows in learning.cursus_quiz_questions.
--
-- Strategy:
--   Populate only targets whose current cursus question count is zero.
--   Source questions are drawn from the workshop quiz bank (learning.quiz_questions),
--   with deterministic ordering and generated question IDs.

CREATE TEMP TABLE tmp_bloc1_targets (
    target_quiz_id VARCHAR(80) PRIMARY KEY,
    target_count INTEGER NOT NULL CHECK (target_count > 0)
) ON COMMIT DROP;

INSERT INTO tmp_bloc1_targets (target_quiz_id, target_count)
VALUES
    ('quiz-1.1', 10),
    ('quiz-1.2', 10),
    ('quiz-1.3', 10),
    ('quiz-1.4', 10),
    ('quiz-1.5', 10),
    ('quiz-1.6', 10),
    ('quiz-final-bloc1', 10);

CREATE TEMP TABLE tmp_bloc1_sources (
    target_quiz_id VARCHAR(80) NOT NULL,
    source_quiz_id VARCHAR(80) NOT NULL,
    source_priority INTEGER NOT NULL,
    PRIMARY KEY (target_quiz_id, source_quiz_id)
) ON COMMIT DROP;

INSERT INTO tmp_bloc1_sources (target_quiz_id, source_quiz_id, source_priority)
VALUES
    ('quiz-1.1', 'quiz-intro', 1),
    ('quiz-1.2', 'quiz-fraud', 1),
    ('quiz-1.3', 'quiz-3ds', 1),
    ('quiz-1.4', 'quiz-iso8583', 1),
    ('quiz-1.5', 'quiz-hsm', 1),
    ('quiz-1.6', 'quiz-emv', 1),
    ('quiz-final-bloc1', 'quiz-intro', 1),
    ('quiz-final-bloc1', 'quiz-iso8583', 2),
    ('quiz-final-bloc1', 'quiz-hsm', 3),
    ('quiz-final-bloc1', 'quiz-3ds', 4),
    ('quiz-final-bloc1', 'quiz-fraud', 5),
    ('quiz-final-bloc1', 'quiz-emv', 6);

CREATE TEMP TABLE tmp_bloc1_missing_targets (
    target_quiz_id VARCHAR(80) PRIMARY KEY,
    target_count INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_bloc1_missing_targets (target_quiz_id, target_count)
SELECT
    t.target_quiz_id,
    t.target_count
FROM tmp_bloc1_targets t
LEFT JOIN (
    SELECT quiz_id, COUNT(*)::integer AS question_count
    FROM learning.cursus_quiz_questions
    GROUP BY quiz_id
) cq
    ON cq.quiz_id = t.target_quiz_id
WHERE COALESCE(cq.question_count, 0) = 0;

WITH pooled AS (
    SELECT
        mt.target_quiz_id,
        mt.target_count,
        s.source_priority,
        qq.question_id AS source_question_id,
        qq.question_text AS question_text,
        qq.options,
        qq.correct_option_index,
        COALESCE(qq.explanation, '') AS explanation,
        qq.question_order
    FROM tmp_bloc1_missing_targets mt
    JOIN tmp_bloc1_sources s
        ON s.target_quiz_id = mt.target_quiz_id
    JOIN learning.quiz_questions qq
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
INSERT INTO learning.cursus_quiz_questions (
    id,
    quiz_id,
    question,
    options,
    correct_option_index,
    explanation,
    question_order
)
SELECT
    l.target_quiz_id || '-auto-q' || LPAD(l.target_order::text, 2, '0') AS id,
    l.target_quiz_id AS quiz_id,
    l.question_text AS question,
    l.options,
    l.correct_option_index,
    l.explanation,
    l.target_order
FROM limited l
ORDER BY l.target_quiz_id, l.target_order
ON CONFLICT (id) DO NOTHING;
