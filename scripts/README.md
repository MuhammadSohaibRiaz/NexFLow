# NexFlow Database Scripts

This directory contains SQL scripts for setting up the NexFlow database in Supabase.

## Execution Order

Run these scripts in the Supabase SQL Editor in the following order:

1. **001_schema.sql** - Core tables (users, pipelines, topics, posts, etc.)
2. **002_rls_policies.sql** - Row Level Security policies
3. **003_functions.sql** - Database functions and triggers
4. **004_seed_data.sql** - Optional test data for development

## Usage

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each script content
4. Execute in order

## Notes

- All tables use UUID primary keys
- Timestamps use `timestamptz` (timezone-aware)
- RLS is enabled on all tables
- Service role key bypasses RLS for backend operations
