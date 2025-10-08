-- Check if Realtime is enabled for media and metrics tables

-- Check publications (Realtime relies on these)
SELECT * FROM pg_publication;

-- Check if tables are in the publication
SELECT
    schemaname,
    tablename,
    pubname
FROM
    pg_publication_tables
WHERE
    tablename IN ('media', 'metrics')
ORDER BY
    tablename;

-- If no results, you need to enable Realtime in Supabase Dashboard:
-- Go to: Database → Replication → Enable for media and metrics tables
