-- Additive migration: existing global/system credentials remain owner_subject NULL.
ALTER TABLE vault_tokens ADD COLUMN owner_subject TEXT;
CREATE INDEX IF NOT EXISTS idx_vault_tokens_owner_subject_created_at
  ON vault_tokens(owner_subject, created_at DESC);
