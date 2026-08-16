/** Closed top-level taxonomy (PRD §18 + system_design.md §6.2). Tags stay open-ended. */
export const CATEGORY_TAXONOMY = [
  "Recipes",
  "Programming",
  "Fitness",
  "Shopping",
  "Travel",
  "Finance",
  "Movies",
  "Books",
  "Career",
  "Education",
  "Health",
  "Productivity",
  "Business",
  "Technology",
  "Design",
  "Uncategorized",
] as const;

export type Category = (typeof CATEGORY_TAXONOMY)[number];
