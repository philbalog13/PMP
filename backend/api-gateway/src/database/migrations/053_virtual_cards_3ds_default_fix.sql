-- Migration 053: align 3DS default on generated client cards
-- Runtime environments may drift from migration 002. Force the intended default.

ALTER TABLE client.virtual_cards
    ALTER COLUMN threeds_enrolled SET DEFAULT true;

UPDATE client.virtual_cards
SET threeds_enrolled = true
WHERE threeds_enrolled IS NULL;
