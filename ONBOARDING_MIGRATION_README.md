# Onboarding Database Migration Guide

## Problem Solved
Previously, onboarding completion was stored in local AsyncStorage, which meant users would see the onboarding tour again every time they logged in on a different device. Now, onboarding status is stored in the Supabase database and synced across all devices.

## Changes Made

### 1. New Files Created
- **`src/onboardingService.ts`** - Service to handle database operations for onboarding preferences
- **`database_migration_onboarding_preferences.sql`** - SQL script to create the database table

### 2. Modified Files  
- **`src/contexts/OnboardingContext.tsx`** - Updated to use database instead of AsyncStorage

## How to Apply the Database Migration

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)

### Step 2: Run the Migration
1. Click **"New Query"**
2. Copy the entire contents of `database_migration_onboarding_preferences.sql`
3. Paste it into the SQL editor
4. Click **"Run"** button

### Step 3: Verify the Migration
After running the migration, verify it was successful:

1. Go to **Table Editor** in Supabase dashboard
2. You should see a new table called `user_onboarding_preferences`
3. The table should have these columns:
   - `id` (bigint, primary key)
   - `user_id` (uuid, foreign key to auth.users)
   - `main_tour_completed` (boolean)
   - `parental_lock_completed` (boolean)
   - `add_routine_completed` (boolean)
   - `add_routine_modal_completed` (boolean)
   - `routine_preset_completed` (boolean)
   - `progress_completed` (boolean)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Step 4: Test the Changes
1. Build and run the app
2. Log in with an existing account
3. Complete the onboarding tour
4. Log out
5. Log in on a different device (or reinstall the app)
6. Onboarding should NOT show again ✅

## How It Works

### Database Storage
- Each user has ONE record in `user_onboarding_preferences` table
- Record is created automatically on first app launch
- All onboarding completion flags are stored in this record

### Cross-Device Sync
- When user logs in on Device A and completes onboarding → saved to database
- When user logs in on Device B → onboarding status is loaded from database
- Result: User sees onboarding only once per account, not once per device

### Caching for Performance
- Database values are cached in AsyncStorage for faster access
- Cache is cleared when user logs out
- Database is always the source of truth

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove the table and all related objects
DROP TABLE IF EXISTS public.user_onboarding_preferences CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
```

## Notes
- Row Level Security (RLS) is enabled - users can only see their own data
- Automatic `updated_at` timestamp updates on every change
- Foreign key CASCADE DELETE - if user is deleted, their preferences are too
