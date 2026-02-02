-- Check columns in users.users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'users' AND table_name = 'users' 
AND column_name IN ('failed_login_attempts', 'last_failed_login', 'locked_until');

-- Check security schema
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'security';

-- Check security.refresh_tokens table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'security' AND table_name = 'refresh_tokens';
