ALTER TABLE client.virtual_cards ALTER COLUMN balance SET DEFAULT 1000;
UPDATE client.virtual_cards SET balance = 1000 WHERE balance = 0;
