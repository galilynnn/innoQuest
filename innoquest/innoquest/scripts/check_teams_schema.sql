-- Check the actual column name of teams table primary key
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- Also check what the primary key constraint is called
SELECT
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'teams'
    AND tc.constraint_type = 'PRIMARY KEY';
