export const ALLERGEN_KEYS = [
  "milk",
  "eggs",
  "fish",
  "shellfish",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];

export const ALLERGEN_LABELS: Record<AllergenKey, string> = {
  milk: "Dairy",
  eggs: "Eggs",
  fish: "Fish",
  shellfish: "Shellfish",
  tree_nuts: "Tree Nuts",
  peanuts: "Peanuts",
  wheat: "Wheat",
  soybeans: "Soy",
  sesame: "Sesame",
};
