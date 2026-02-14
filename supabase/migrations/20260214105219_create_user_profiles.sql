/*
  # Create user profiles table with N3 email generation

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users.id)
      - `first_name` (text, not null)
      - `last_name` (text, not null)
      - `n3_email` (text, unique, not null) - the generated @n3mail.com address
      - `display_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `onboarding_completed` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. New Functions
    - `generate_n3_email(first_name text, last_name text)` - generates a unique @n3mail.com email
      - Normalizes names to lowercase, strips non-alpha characters
      - Format: firstname.lastname@n3mail.com
      - If taken, appends incrementing number (firstname.lastname2@n3mail.com, etc.)

  3. Security
    - Enable RLS on user_profiles
    - Authenticated users can read their own profile
    - Authenticated users can insert their own profile (during onboarding)
    - Authenticated users can update their own profile
    - Authenticated users can read basic info (name, email) of other users (for email system)

  4. Indexes
    - Unique index on n3_email for fast lookups
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  n3_email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can read basic profile info of others"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION generate_n3_email(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_name text;
  candidate text;
  counter int := 1;
BEGIN
  base_name := lower(regexp_replace(p_first_name, '[^a-zA-Z]', '', 'g'))
    || '.'
    || lower(regexp_replace(p_last_name, '[^a-zA-Z]', '', 'g'));

  candidate := base_name || '@n3mail.com';

  LOOP
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE n3_email = candidate) THEN
      RETURN candidate;
    END IF;
    counter := counter + 1;
    candidate := base_name || counter::text || '@n3mail.com';
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_n3_email
  ON user_profiles(n3_email);
