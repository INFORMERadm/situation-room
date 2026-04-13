/*
  # Add bio column to user_profiles

  1. Modified Tables
    - `user_profiles`
      - Add `bio` (text, nullable, default '') - User's personal bio/description for AI personalization

  2. Important Notes
    - Bio is collected during onboarding so the AI assistant can personalize responses
    - Existing users will have an empty bio until they update their profile
    - No RLS changes needed - existing policies cover all columns on user_profiles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text NOT NULL DEFAULT '';
  END IF;
END $$;
