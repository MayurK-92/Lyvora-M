---
name: Lyvora Digital Echo
colors:
  surface: '#fbf8fc'
  surface-dim: '#dbd9dc'
  surface-bright: '#fbf8fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f6'
  surface-container: '#f0edf0'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e5'
  on-surface: '#1b1b1e'
  on-surface-variant: '#45464e'
  inverse-surface: '#303033'
  inverse-on-surface: '#f2f0f3'
  outline: '#75777e'
  outline-variant: '#c6c6ce'
  surface-tint: '#525e7f'
  primary: '#182442'
  on-primary: '#ffffff'
  primary-container: '#2e3a59'
  on-primary-container: '#98a4c9'
  inverse-primary: '#bac6ec'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#312300'
  on-tertiary: '#ffffff'
  tertiary-container: '#4a380c'
  on-tertiary-container: '#bca26c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#bac6ec'
  on-primary-fixed: '#0d1a38'
  on-primary-fixed-variant: '#3a4666'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#fddfa4'
  tertiary-fixed-dim: '#dfc38b'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#574417'
  background: '#fbf8fc'
  on-background: '#1b1b1e'
  surface-variant: '#e4e2e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  container-max: 1200px
  gutter: 20px
---

## Brand & Style

The design system is engineered to evoke a sense of "Cognitive Calm." As an AI-powered personal memory platform, it prioritizes a sophisticated and trustworthy atmosphere, acting as a reliable digital extension of the user's own mind. 

The aesthetic is a refined **Modern Minimalism** with a **PWA-first** philosophy. It utilizes heavy whitespace to reduce cognitive load, allowing the AI-curated content to breathe. The emotional response should be one of clarity and effortless organization, moving away from the "noise" of traditional social media toward a focused, utilitarian elegance.

## Colors

The palette is anchored by **Deep Indigo** (Primary) for brand authority and **Slate** (Secondary) for functional UI elements. The background uses a soft off-white (#F9FAFB) to reduce eye strain during long reading sessions.

Accent colors are strictly reserved for categorization and semantic meaning. These high-vibrancy tones should be used sparingly—as small indicators, progress bars, or "edge-accents" on cards—to ensure the interface remains professional and does not become visually cluttered.

## Typography

This design system utilizes **Inter** across all levels to ensure maximum readability and a systematic, clean feel. 

- **Hierarchy:** Use `display-lg` only for empty state welcomes or high-level dashboard summaries. 
- **Spreading:** Body text uses a generous 1.5x line-height to facilitate scanning of long-form memories.
- **Labels:** `label-sm` is used for category chips and metadata, often paired with increased letter spacing for legibility at small sizes.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict maximum widths to maintain readability on desktop. 

- **Mobile:** A single-column layout with 16px side margins.
- **Tablet:** A 2-column masonry or grid layout for memory cards.
- **Desktop:** A 12-column grid. The "Capture Bar" remains centered and fixed at the bottom of the viewport, mimicking premium mobile OS interactions.
- **Rhythm:** All margins and paddings must be multiples of 4px. Use `lg` (24px) for internal card padding to emphasize the premium, spacious feel.

## Elevation & Depth

Depth is communicated through **Tonal Layering** and **Soft Shadows**. 

1. **Level 0 (Background):** #F9FAFB.
2. **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) and a 1px border in Slate-100.
3. **Level 2 (Modals/Popovers):** Pure White with a more pronounced shadow (0px 10px 30px rgba(0,0,0,0.08)) to indicate temporary interaction.

Avoid heavy blacks in shadows; use tinted shadows (indigo-tinted) to maintain the "Sophisticated" brand tone.

## Shapes

The design system employs a **Rounded** shape language to feel approachable yet modern. 

- **Standard Elements:** 0.5rem (8px) for buttons and inputs.
- **Memory Cards:** 1rem (16px) to 1.5rem (24px) to create a friendly, "contained" look.
- **Pills:** Category chips and the Capture Bar use maximum rounding (full-pill) to distinguish them from content containers.

## Components

### Memory Cards
The signature component. Cards must feature a 4px wide vertical "accent stripe" on the far left edge, color-coded by category (e.g., Green for Finance). Padding should be generous (24px). Icons should be Lucide-style (2px stroke) in the Secondary Slate color.

### Capture Bar
A prominent, pill-shaped input fixed at the bottom of the screen. It should feature a subtle glassmorphism effect (backdrop-blur) to stay legible over scrolling content.

### Category Chips
Small, interactive pills. Use a desaturated version of the category color for the background (10% opacity) and the full-saturation color for the text and icon.

### Progress Bars (AI Processing)
Slim (4px height) bars using a gradient of Primary Indigo to a lighter slate. Use a subtle pulse animation to indicate active AI synthesis.

### Buttons
- **Primary:** Solid Deep Indigo with white text.
- **Secondary:** White background with a 1px Slate border.
- **Ghost:** No border or background; text in Deep Indigo; used for low-priority actions.