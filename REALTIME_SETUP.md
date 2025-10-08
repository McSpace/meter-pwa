# Supabase Realtime Setup

## Problem
If the UI doesn't update automatically after AI analysis completes, the issue is likely that Realtime is not enabled for the `media` and `metrics` tables.

## Solution

### 1. Enable Realtime in Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Database** → **Replication**
3. Find the `media` table and click the toggle to enable Realtime
4. Find the `metrics` table and click the toggle to enable Realtime

### 2. Verify Realtime is Working

After enabling Realtime:

1. Open your app in the browser
2. Open DevTools → Console
3. Upload an audio/photo file
4. Look for these log messages:
   ```
   [useMedia] Subscription status: SUBSCRIBED
   [useMedia] Received change: { ... }
   ```

If you see `SUBSCRIBED` status and changes are received, Realtime is working!

### 3. Alternative: Enable via SQL

If you prefer SQL, run this in Supabase SQL Editor:

```sql
-- Enable Realtime for media table
ALTER PUBLICATION supabase_realtime ADD TABLE media;

-- Enable Realtime for metrics table
ALTER PUBLICATION supabase_realtime ADD TABLE metrics;
```

### 4. Check if Realtime is Enabled

Run this query to verify:

```sql
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
```

You should see both `media` and `metrics` in the results.

## How It Works

1. When AI analysis completes, it updates `media.analysis_status` to `'completed'`
2. Supabase broadcasts this change via Realtime
3. `useMedia` hook receives the change and refetches data
4. UI updates automatically with the new status and metrics

## Debugging

If Realtime still doesn't work:

1. Check browser console for subscription status
2. Verify no errors in Supabase logs
3. Try manually updating a record in Supabase and see if UI updates
4. Check that RLS policies allow SELECT on media/metrics tables
