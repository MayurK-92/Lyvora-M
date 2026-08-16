import type { IconName } from "@lyvora/ui";

export interface CategoryStyle {
  /** Material Symbols ligature shown in the category chip. */
  icon: IconName;
  /** Background class for the 4px accent stripe on memory surfaces. */
  stripe: string;
  /** Background + text classes for the category chip. */
  chip: string;
  /** Background class for the square icon tile used by Rediscover. */
  tile: string;
  /** Raw hex for canvas-rendered surfaces (graph nodes, report donut). */
  accent: string;
}

/**
 * One source of truth for how a category is coloured and iconified.
 *
 * Chip and stripe classes stay inside the Material-3 palette exactly as the
 * design uses them (home_lyvora: Recipes → tertiary, Programming → primary;
 * search_lyvora: Health & Fitness → primary-container, Web Snippet →
 * secondary). `accent` mirrors the vibrant hexes the graph screen introduces
 * (#f97316 Recipes, #3b82f6 Code, #10b981 Finance) for surfaces that cannot
 * use CSS classes.
 */
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Recipes: {
    icon: "restaurant_menu",
    stripe: "bg-tertiary",
    chip: "bg-tertiary/10 text-tertiary",
    tile: "bg-tertiary-fixed text-on-tertiary-fixed",
    accent: "#f97316",
  },
  Programming: {
    icon: "code",
    stripe: "bg-primary",
    chip: "bg-primary/10 text-primary",
    tile: "bg-primary-fixed text-on-primary-fixed",
    accent: "#3b82f6",
  },
  Technology: {
    icon: "devices",
    stripe: "bg-primary-container",
    chip: "bg-primary-container/10 text-primary-container",
    tile: "bg-primary-fixed-dim text-on-primary-fixed",
    accent: "#6366f1",
  },
  Finance: {
    icon: "payments",
    stripe: "bg-secondary",
    chip: "bg-secondary-container/30 text-secondary",
    tile: "bg-secondary-fixed text-on-secondary-fixed",
    accent: "#10b981",
  },
  Fitness: {
    icon: "fitness_center",
    stripe: "bg-error",
    chip: "bg-error-container text-on-error-container",
    tile: "bg-error-container text-on-error-container",
    accent: "#ef4444",
  },
  Health: {
    icon: "health_and_safety",
    stripe: "bg-error/70",
    chip: "bg-error-container/70 text-on-error-container",
    tile: "bg-error-container/70 text-on-error-container",
    accent: "#f43f5e",
  },
  Travel: {
    icon: "flight_takeoff",
    stripe: "bg-tertiary-fixed-dim",
    chip: "bg-tertiary-fixed/60 text-on-tertiary-fixed-variant",
    tile: "bg-tertiary-fixed text-on-tertiary-fixed",
    accent: "#0ea5e9",
  },
  Shopping: {
    icon: "shopping_bag",
    stripe: "bg-tertiary-container",
    chip: "bg-tertiary-container/10 text-tertiary-container",
    tile: "bg-tertiary-fixed-dim text-on-tertiary-fixed",
    accent: "#eab308",
  },
  Movies: {
    icon: "movie",
    stripe: "bg-on-secondary-fixed",
    chip: "bg-secondary-fixed/60 text-on-secondary-fixed-variant",
    tile: "bg-secondary-fixed text-on-secondary-fixed",
    accent: "#a855f7",
  },
  Books: {
    icon: "book",
    stripe: "bg-secondary",
    chip: "bg-secondary-container/40 text-on-secondary-container",
    tile: "bg-secondary-container text-on-secondary-container",
    accent: "#8b5cf6",
  },
  Career: {
    icon: "work",
    stripe: "bg-on-primary-fixed-variant",
    chip: "bg-primary-fixed/60 text-on-primary-fixed-variant",
    tile: "bg-primary-fixed text-on-primary-fixed",
    accent: "#0891b2",
  },
  Education: {
    icon: "school",
    stripe: "bg-primary-fixed-dim",
    chip: "bg-primary-fixed/50 text-on-primary-fixed-variant",
    tile: "bg-primary-fixed-dim text-on-primary-fixed",
    accent: "#14b8a6",
  },
  Productivity: {
    icon: "task_alt",
    stripe: "bg-secondary-fixed-dim",
    chip: "bg-secondary-fixed/60 text-on-secondary-fixed-variant",
    tile: "bg-secondary-fixed-dim text-on-secondary-fixed",
    accent: "#22c55e",
  },
  Business: {
    icon: "business_center",
    stripe: "bg-on-tertiary-container",
    chip: "bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant",
    tile: "bg-tertiary-fixed-dim text-on-tertiary-fixed",
    accent: "#d97706",
  },
  Design: {
    icon: "palette",
    stripe: "bg-inverse-primary",
    chip: "bg-primary-fixed-dim/40 text-on-primary-fixed-variant",
    tile: "bg-primary-fixed-dim text-on-primary-fixed",
    accent: "#ec4899",
  },
  Uncategorized: {
    icon: "article",
    stripe: "bg-outline-variant",
    chip: "bg-surface-container-high text-on-surface-variant",
    tile: "bg-surface-container-high text-on-surface-variant",
    accent: "#75777e",
  },
};

const FALLBACK = CATEGORY_STYLES.Uncategorized!;

export function getCategoryStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return FALLBACK;
  return CATEGORY_STYLES[category] ?? FALLBACK;
}
