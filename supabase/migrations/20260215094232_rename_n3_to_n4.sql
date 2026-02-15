/*
  # Rename N3 to N4 across database

  1. Modified Tables
    - `user_profiles`
      - Rename column `n3_email` to `n4_email`

  2. Modified Functions
    - Replace `generate_n3_email` with `generate_n4_email`
      - Same logic, but generates @n4mail.com addresses instead of @n3mail.com

  3. Modified Indexes
    - Rename index from `idx_user_profiles_n3_email` to `idx_user_profiles_n4_email`

  4. Security
    - No changes to RLS policies (they reference column by table, unaffected by rename)

  5. Important Notes
    - Existing email addresses in the column are updated from @n3mail.com to @n4mail.com
    - The old function `generate_n3_email` is dropped and replaced with `generate_n4_email`
*/

ALTER TABLE user_profiles RENAME COLUMN n3_email TO n4_email;

UPDATE user_profiles
SET n4_email = REPLACE(n4_email, '@n3mail.com', '@n4mail.com')
WHERE n4_email LIKE '%@n3mail.com';

DROP FUNCTION IF EXISTS generate_n3_email(text, text);

CREATE OR REPLACE FUNCTION generate_n4_email(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_name text;
  candidate text;
  counter integer := 2;
BEGIN
  base_name := lower(regexp_replace(p_first_name, '[^a-zA-Z]', '', 'g'))
    || '.' || lower(regexp_replace(p_last_name, '[^a-zA-Z]', '', 'g'));

  candidate := base_name || '@n4mail.com';

  LOOP
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE n4_email = candidate) THEN
      RETURN candidate;
    END IF;
    candidate := base_name || counter::text || '@n4mail.com';
    counter := counter + 1;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_profiles_n3_email'
  ) THEN
    ALTER INDEX idx_user_profiles_n3_email RENAME TO idx_user_profiles_n4_email;
  END IF;
END $$;
