-- ============================================================
-- Add consulting tables to the supabase_realtime publication.
-- ------------------------------------------------------------
-- Enables the JS client to subscribe to row-level changes via
-- supabase.channel(...).on('postgres_changes', { schema: 'consulting', ... })
-- RLS continues to apply, so each subscriber only receives
-- events for rows they are allowed to SELECT.
-- ============================================================

alter publication supabase_realtime add table consulting.tasks;
alter publication supabase_realtime add table consulting.projects;
alter publication supabase_realtime add table consulting.time_entries;
