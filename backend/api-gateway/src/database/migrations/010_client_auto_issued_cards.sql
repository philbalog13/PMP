-- Migration 010: Auto-issued client cards + allocation support for generated cards
-- - Adds is_auto_issued flag on client.virtual_cards
-- - Backfills legacy cards to keep one auto-issued card per client

ALTER TABLE client.virtual_cards
    ADD COLUMN IF NOT EXISTS is_auto_issued BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_virtual_cards_client_auto_issued
    ON client.virtual_cards(client_id, is_auto_issued);

-- Backfill legacy demo cards: pick the oldest DEMO USER card per client
WITH demo_cards AS (
    SELECT DISTINCT ON (client_id) id
    FROM client.virtual_cards
    WHERE cardholder_name = 'DEMO USER'
    ORDER BY client_id, created_at ASC, id ASC
)
UPDATE client.virtual_cards vc
SET is_auto_issued = true
FROM demo_cards dc
WHERE vc.id = dc.id;

-- For clients without auto-issued card, mark their oldest card as auto-issued
WITH clients_without_auto AS (
    SELECT vc.client_id
    FROM client.virtual_cards vc
    GROUP BY vc.client_id
    HAVING BOOL_OR(vc.is_auto_issued) = false
), oldest_cards AS (
    SELECT DISTINCT ON (vc.client_id) vc.id
    FROM client.virtual_cards vc
    JOIN clients_without_auto cwa ON cwa.client_id = vc.client_id
    ORDER BY vc.client_id, vc.created_at ASC, vc.id ASC
)
UPDATE client.virtual_cards vc
SET is_auto_issued = true
FROM oldest_cards oc
WHERE vc.id = oc.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_cards_one_auto_per_client
    ON client.virtual_cards(client_id)
    WHERE is_auto_issued = true;
