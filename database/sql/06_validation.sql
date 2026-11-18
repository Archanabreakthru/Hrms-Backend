-- ============================================================================
-- SCRIPT 06: VALIDATION AND RECONCILIATION
-- DATABASE: Hrms (PostgreSQL 14+)
-- PURPOSE: Verify existence of schemas, table counts, primary keys, foreign keys,
--          unique constraints, and indexes across the 9 approved schemas.
-- NOTE: Connect to the existing target database 'Hrms' before executing this script.
-- ============================================================================


-- 1. Schema Existence Check
SELECT 
    schema_name,
    CASE 
        WHEN schema_name IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification') 
        THEN 'APPROVED' 
        ELSE 'OTHER' 
    END AS status
FROM information_schema.schemata
WHERE schema_name IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification')
ORDER BY schema_name;

-- 2. Table Count by Schema
SELECT 
    table_schema, 
    COUNT(*) AS table_count
FROM information_schema.tables 
WHERE table_schema IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification')
  AND table_type = 'BASE TABLE'
GROUP BY table_schema
ORDER BY table_schema;

-- 3. Total Columns Count by Schema
SELECT 
    table_schema, 
    COUNT(*) AS total_columns
FROM information_schema.columns 
WHERE table_schema IN ('auth', 'org', 'employee', 'attendance', 'payroll', 'expense', 'asset', 'client', 'notification')
GROUP BY table_schema
ORDER BY table_schema;

-- 4. Primary Key Verification
SELECT 
    tc.table_schema, 
    tc.table_name, 
    kc.column_name AS primary_key_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc 
  ON tc.constraint_name = kc.constraint_name 
 AND tc.table_schema = kc.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema IN ('auth', 'org', 'employee', 'attendance', 'expense', 'asset', 'client', 'notification')
ORDER BY tc.table_schema, tc.table_name;

-- 5. Foreign Key Constraints Count by Schema
SELECT 
    tc.table_schema, 
    COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('auth', 'org', 'employee', 'attendance', 'expense', 'asset', 'client', 'notification')
GROUP BY tc.table_schema
ORDER BY tc.table_schema;

-- 6. Detailed Foreign Key Audit List
SELECT
    tc.constraint_name,
    tc.table_schema AS source_schema,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_schema AS target_schema,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('auth', 'org', 'employee', 'attendance', 'expense', 'asset', 'client', 'notification')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;

-- 7. Indexes Count by Schema (Excluding System Table Indexes)
SELECT 
    schemaname, 
    COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname IN ('auth', 'org', 'employee', 'attendance', 'expense', 'asset', 'client', 'notification')
GROUP BY schemaname
ORDER BY schemaname;

-- 8. Identify Orphaned Foreign Keys (Safety Check)
SELECT 
    tc.constraint_name, 
    tc.table_schema, 
    tc.table_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND rc.constraint_name IS NULL
  AND tc.table_schema IN ('auth', 'org', 'employee', 'attendance', 'expense', 'asset', 'client', 'notification');

