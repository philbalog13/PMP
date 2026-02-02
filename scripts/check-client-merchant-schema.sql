-- Check if tables exist
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('client', 'merchant');

-- Check columns for client.virtual_cards
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'client' AND table_name = 'virtual_cards';

-- Check columns for client.transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'client' AND table_name = 'transactions';

-- Check columns for merchant.pos_terminals
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'merchant' AND table_name = 'pos_terminals';

-- Check columns for merchant.api_keys
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'merchant' AND table_name = 'api_keys';
