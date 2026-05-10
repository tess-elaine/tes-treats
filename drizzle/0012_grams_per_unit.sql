-- Migration 0012: rename grams_per_cup → grams_per_unit on ingredient
-- gramsPerUnit means "grams per 1 of defaultUnit", so it works for cup, tsp,
-- stick, each, etc. — not just cups.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingredient' AND column_name = 'grams_per_cup'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingredient' AND column_name = 'grams_per_unit'
  ) THEN
    ALTER TABLE "ingredient" RENAME COLUMN "grams_per_cup" TO "grams_per_unit";
  END IF;
END $$;
