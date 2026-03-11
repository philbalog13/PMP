-- Seed 053: normalize cursus titles
-- Goal: remove leading "BLOC ..." and "Module ..." prefixes from cursus titles.
-- Idempotent and safe to run multiple times.

UPDATE learning.cursus
SET title = btrim(
    regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    title,
                    '^\s*BLOC\s*[-_ ]*[0-9]+(?:\.[0-9]+)?\s*[^[:alnum:]]*\s*',
                    '',
                    'i'
                ),
                '^\s*BLOC\s*[-_ ]*[0-9]+(?:\.[0-9]+)?\s*',
                '',
                'i'
            ),
            '^\s*Module\s*[0-9]+(?:-[0-9]+)?\s*[^[:alnum:]]*\s*',
            '',
            'i'
        ),
        '^\s*[^[:alnum:]]+\s*',
        '',
        'i'
    )
)
WHERE title ~* '^\s*(bloc|module|[^[:alnum:]])';

