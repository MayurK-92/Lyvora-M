# Lyvora UI Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Lyvora web app's presentation layer so every screen matches `docs/UI DESIGN/*/code.html` pixel-for-pixel, while preserving all existing Supabase/Drizzle/Inngest/AI SDK behaviour.

**Architecture:** Replace the current dark `shadcn`-ish token set with the design's Material-3 light palette expressed as Tailwind v4 `@theme` tokens in `packages/config/tailwind-theme.css`. Promote the design's repeated markup into typed primitives in `@lyvora/ui` (Button, Chip, Card, Icon, …) and app-level composites in `apps/web/src/components`. Every page keeps its existing server component data-loading and client component state machine; only JSX/classNames change. Two additive backend pieces are needed because the design shows UI the app has no data for: an entity co-occurrence graph query and an entity-detail API route.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first config), TypeScript 5.9, Supabase, Drizzle, AI SDK v7, Inngest, Material Symbols Outlined (icon font), Inter (`next/font/google`).

## Global Constraints

- The design HTML in `docs/UI DESIGN/*/code.html` is the single source of truth for spacing, color, radius, shadow, animation and layout. Never redesign or approximate.
- All seven design files share one identical `tailwind.config` block — tokens are extracted once, never duplicated per page.
- `home_lyvora/code.html` and `digital_mind_knowledge_base/code.html` are byte-identical (verified by hash); treat as one design.
- Preserve exactly: `/api/*` route contracts, Supabase queries, `requireUser()` auth gating, Inngest events, `useChat` transport wiring, capture realtime + polling, search facet round-trips.
- No hardcoded application data. Every static string in the design HTML that represents user content maps to a real field or is conditionally omitted.
- Colors are used only via semantic token classes (`bg-surface-container-low`, `text-on-surface-variant`, …). Raw hex only where the design itself uses raw hex (graph node colors `#f97316`/`#3b82f6`/`#10b981`, report donut segments).
- Spacing tokens: `xs`=4px, `sm`=8px, `md`=16px, `lg`=24px, `xl`=32px, `2xl`=48px. Radii come from Tailwind v4 defaults, which already equal the design (`lg`=0.5rem, `xl`=0.75rem, `2xl`=1rem, `3xl`=1.5rem, bare `rounded`=0.25rem) — do **not** override the radius scale.
- Responsiveness: the design's `fixed left-0 w-72` sidebar only works at desktop. Below `lg` the same sidebar markup renders inside a slide-in drawer and the existing bottom nav is kept (restyled). This is the only permitted layout deviation, and it is required.
- Accessibility is mandatory: `aria-current` on active nav, `aria-hidden` on decorative icons, visible focus rings, semantic landmarks, `aria-live` on async status.

---

## File Structure

**Design tokens**
- Modify: `packages/config/tailwind-theme.css` — full M3 palette + spacing + type scale, plus legacy aliases so nothing renders invisible during migration.
- Modify: `apps/web/src/app/globals.css` — keyframes from the design (`progress`, `pulse-dot`, `fade-in-up`), `.material-symbols-outlined` hardening, scrollbar hiding, reduced-motion guard.
- Modify: `apps/web/src/app/layout.tsx` — Inter via `next/font/google`, Material Symbols `<link>`, light `themeColor`.

**`@lyvora/ui` primitives** (presentational, zero app dependencies)
- Create: `icon.tsx`, `icon-button.tsx`, `chip.tsx`, `badge.tsx`, `textarea.tsx`, `progress-bar.tsx`, `avatar.tsx`, `skeleton.tsx`, `spinner.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `segmented-tabs.tsx`, `accent-stripe.tsx`
- Modify: `button.tsx`, `input.tsx`, `card.tsx`, `label.tsx`, `index.ts`

**App shell**
- Modify: `nav/nav-items.ts`, `nav/app-sidebar.tsx`, `nav/app-bottom-nav.tsx`, `nav/sign-out-button.tsx`
- Create: `nav/app-top-bar.tsx`, `nav/mobile-nav-drawer.tsx`, `nav/sidebar-nav.tsx`
- Delete: `nav/app-mobile-header.tsx` (superseded by `app-top-bar.tsx`)
- Create: `layout/page-container.tsx`, `layout/section-heading.tsx`
- Modify: `app/(app)/layout.tsx`

**Domain mapping**
- Create: `lib/categories.ts` — the single `Category -> { icon, stripe, chipClass }` map. All accent stripes and chips read from here.
- Create: `lib/format.ts` — `formatRelativeDate`, `formatAbsoluteDate`, `sourceHint`.

**Memory surfaces**
- Modify: `memory/memory-card.tsx` (feed card), `memory/payload-renderer.tsx`
- Create: `memory/search-result-card.tsx`, `memory/compact-memory-card.tsx`, `memory/memory-hero.tsx`, `memory/ask-about-memory-bar.tsx`

**Feature panels** — modify `capture/*`, `search/*`, `chat/*`; create `chat/chat-sidebar.tsx`, `chat/chat-message.tsx`, `chat/chat-composer.tsx`, `graph/*`, `report/*`.

**Backend additions (additive only)**
- Create: `packages/core/src/graph/entity-graph.ts` + export from `packages/core/src/index.ts`
- Create: `apps/web/src/app/api/graph/entity/[entityId]/route.ts`

**Assets**
- Copy `docs/UI DESIGN/lyvora_brand_logo/screen.png` -> `apps/web/public/brand/lyvora-logo.png`

---

### Task 1: Design tokens, fonts, icon font

**Files:** `packages/config/tailwind-theme.css`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/public/brand/lyvora-logo.png`

**Produces:** token classes `bg-surface*`, `text-on-surface*`, `bg-primary*`, `bg-secondary-container`, `bg-tertiary*`, `text-outline*`, `bg-error*`; spacing `xs|sm|md|lg|xl|2xl|gutter`; text scale `display-lg|headline-lg|headline-lg-mobile|headline-md|body-lg|body-md|label-md|label-sm`; container `max-w-page` (1200px).

- [ ] Rewrite `tailwind-theme.css`: `color-scheme: light`, all 47 M3 colors from `DESIGN.md` frontmatter verbatim, named spacing keys, `--text-*` triples with `--line-height`/`--letter-spacing`/`--font-weight`, `--container-page: 1200px`, `--font-sans: var(--font-inter), …`. Keep legacy aliases (`--color-background`, `--color-card`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-accent`, `--color-accent-foreground`, `--color-destructive`, `--color-foreground`) mapped onto the light palette. Do not define `--radius-*`.
- [ ] Add design keyframes to `globals.css`: `progress` (translateX -100% -> 200%), `pulse-dot`, `fade-in-up`, plus existing `page-enter`/`capture-in`/`capture-done`; add `.material-symbols-outlined` base rule and `::-webkit-scrollbar{display:none}`; extend the `prefers-reduced-motion` block.
- [ ] `layout.tsx`: swap Geist for `Inter` (`variable: "--font-inter"`), add the two Material Symbols `<link rel="stylesheet">` tags in `<head>`, set `viewport.themeColor` to `#fbf8fc`.
- [ ] Copy the brand logo asset into `public/brand/`.
- [ ] Verify: `pnpm --filter @lyvora/web build` compiles; a scratch page renders `bg-surface-container-low` / `text-display-lg` correctly.

---

### Task 2: `@lyvora/ui` primitives

**Files:** all of `packages/ui/src/components/*`, `packages/ui/src/index.ts`

**Interfaces produced (consumed by every later task):**
- `<MaterialIcon name={IconName} size?: number | "sm"|"md"|"lg" filled?: boolean className?/>` — renders `<span aria-hidden className="material-symbols-outlined">{name}</span>`. `IconName` is a string union of every icon used across the seven design files.
- `<Button variant="primary"|"tonal"|"outline"|"ghost"|"destructive" size="sm"|"md"|"lg"|"icon" shape="pill"|"rounded" asChild? />` — `primary` = `bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container shadow-sm`; `outline` = `border border-primary text-primary hover:bg-primary/5`; `tonal` = `bg-secondary-container text-on-secondary-container`.
- `<IconButton label icon={IconName} />` — square `p-xs`, `text-on-surface-variant hover:text-on-surface`.
- `<Chip tone="primary"|"secondary"|"tertiary"|"neutral"|"error" icon? selected? as="span"|"button" />` — the `px-sm py-xs rounded-full` category/tag pill.
- `<Badge>`, `<Card accent?>` (accent renders the 4px `absolute left-0 inset-y-0 w-1` stripe), `<Input>`, `<Textarea autoGrow maxHeight>`, `<ProgressBar value? indeterminate>`, `<Avatar src alt size>`, `<Skeleton>`, `<Spinner>`, `<SegmentedTabs items value onChange>`, `<Dialog>`, `<DropdownMenu>`.

- [ ] Write each primitive with `cva` variants and forwarded refs; every interactive element carries `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`.
- [ ] Re-export everything from `index.ts`.
- [ ] Verify: `pnpm --filter @lyvora/ui typecheck` passes.

---

### Task 3: App shell (sidebar, top bar, bottom nav, drawer, layout)

**Files:** `nav/nav-items.ts`, `nav/sidebar-nav.tsx`, `nav/app-sidebar.tsx`, `nav/app-top-bar.tsx`, `nav/mobile-nav-drawer.tsx`, `nav/app-bottom-nav.tsx`, `nav/sign-out-button.tsx`, `app/(app)/layout.tsx`, `layout/page-container.tsx`; delete `nav/app-mobile-header.tsx`

**Consumes:** Task 2 primitives. **Produces:** `NAV_ITEMS` with Material icon names (`home`, `search`, `forum`, `hub`, `bar_chart`, `settings`); `<PageContainer>` = `px-md md:px-xl py-lg max-w-page mx-auto w-full`.

Design reference — sidebar: `fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.02)]`; brand row `p-lg mb-md flex items-center gap-sm` with `h-8 w-auto` logo + `text-headline-md text-primary tracking-tight`; links `flex items-center px-md py-sm rounded-xl transition-all`, active `bg-secondary-container text-on-secondary-container font-bold shadow-sm`, idle `text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface`, icon `mr-md`. Settings sits in a second `<nav class="px-md pb-xl">`.

Top bar: `fixed top-0 left-72 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 px-lg flex items-center justify-end shadow-[0_1px_8px_rgba(0,0,0,0.04)]` containing notifications icon button, `h-8 w-[1px] bg-outline-variant mx-sm` divider, and a `w-8 h-8 rounded-full border border-outline-variant` avatar. Below `lg` it becomes `left-0` and gains a menu button + brand on the left.

- [ ] Extract `SidebarNav` so the desktop `<aside>` and the mobile drawer share identical markup (DRY).
- [ ] Top bar avatar uses the authenticated user's `user_metadata.avatar_url`, falling back to an initials avatar from `user.email`. Clicking it opens a dropdown with the email and the existing `SignOutButton` server action — preserving sign-out.
- [ ] Bottom nav (`<lg` only) restyled with design tokens; keep the existing `MOBILE_PRIMARY_ITEMS` / `MOBILE_MORE_ITEMS` split and its escape-key/outside-click handling.
- [ ] `(app)/layout.tsx`: `lg:pl-72`, `<main id="main-content" className="relative pt-16 min-h-screen bg-surface">`, keep `requireUser()` and `<PageEnter>`.
- [ ] Verify: every route still gates on auth; nav highlights match `pathname`; sign-out works.

---

### Task 4: Category map, formatters, memory card family

**Files:** `lib/categories.ts`, `lib/format.ts`, `memory/memory-card.tsx`, `memory/search-result-card.tsx`, `memory/compact-memory-card.tsx`, `ui/empty-state.tsx`

**Consumes:** Tasks 2–3. **Produces:** `getCategoryStyle(category: string): { icon: IconName; stripe: string; chip: string }` covering all 16 `CATEGORY_TAXONOMY` values plus an `Uncategorized` fallback; `formatRelativeDate(iso)`, `formatAbsoluteDate(iso)`, `sourceHint(memory)`.

Design reference — feed card (`home_lyvora` lines 38–56): `relative flex flex-col bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300`, stripe `absolute left-0 top-0 bottom-0 w-1`, body `p-lg flex-1 flex flex-col justify-between ml-1`, category chip + relative date row, `text-headline-md line-clamp-2 group-hover:text-primary`, `text-body-md text-on-surface-variant line-clamp-3`, `#tag` row in `text-label-sm text-on-surface-variant`.

Search result card (`search_lyvora` lines 84–106): `bg-surface-container-lowest rounded-xl p-lg shadow-sm border border-outline-variant/30`, optional `heroImageUrl` band `w-full h-32 rounded-lg bg-cover`, `line-clamp-1` title, absolute date, bookmark `IconButton`, `md:col-span-2` wide variant when a hero image exists.

- [ ] Feed card keeps `href={/memory/${id}}` and the `animate-capture-in` fresh-highlight `className` pass-through.
- [ ] Search card accepts a `highlight` term and wraps matches in `<mark class="bg-primary/20 text-on-surface font-semibold px-1 rounded">` — text-node-only replacement, never `dangerouslySetInnerHTML`.
- [ ] Compact card covers the three small-card usages: Rediscover tile, chat citation, related memory.
- [ ] Empty state restyled: dashed `border-outline-variant`, `text-on-surface-variant`, outline button.
- [ ] Verify: cards render with real DB rows for every category; missing `tldr`/`tags`/`heroImageUrl` degrade cleanly.

---

### Task 5: Capture bar, progress card, home page

**Files:** `capture/capture-bar.tsx`, `capture/capture-progress.tsx`, `capture/capture-feed.tsx`, `onboarding/onboarding-card.tsx`, `app/(app)/home/page.tsx`

**Design reference:** `home_lyvora` lines 4–138.

- [ ] Capture bar becomes the fixed glassmorphic pill: `fixed bottom-lg left-1/2 -translate-x-1/2 w-[90%] max-w-3xl z-40` > `bg-surface/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-full border border-outline-variant/20 p-xs`. Row 1 = Link/Text/File pills (active `bg-secondary-container text-on-secondary-container`). Row 2 = borderless `text-body-lg` input + `Save` pill button with `arrow_upward`. Text mode swaps the input for an auto-growing textarea; File mode swaps it for a file label — the pill expands rather than moving.
- [ ] **Preserve unchanged:** `postCapture`, `uploadFile`, `Idempotency-Key` header, signed-upload flow, optional-note field (moves into an expandable row), `canSubmit` logic, error surfacing.
- [ ] Progress card reuses the design's "Processing" card: spinning `sync` icon, `PROCESSING` label, `animate-pulse` body line, `h-1 bg-surface-container-high` track with `bg-primary` fill driven by the existing `STAGES` percentages. Failed state uses `error`/`on-error-container` tokens.
- [ ] Home page: `display-lg` hero ("Your Digital Mind." / subtitle), Recent Memories section with `memory` icon heading + "View All" link to `/search`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg`, then the Rediscover section (`rounded-2xl bg-surface-container-low p-lg` + blurred `bg-primary-fixed/20` blob) fed by the existing `listRediscovery` data, each tile using its category icon tile.
- [ ] **Preserve unchanged:** realtime channel subscription, 1.5s polling, `freshIds` animation timers, `shareError` alert, onboarding card dismissal in `localStorage`.
- [ ] Verify: paste a URL, watch queued -> done, card appears at the head of the grid.

---

### Task 6: Search page

**Files:** `search/search-panel.tsx`, `search/search-filters.tsx`, `app/(app)/search/page.tsx`

**Design reference:** `search_lyvora` lines 4–167.

- [ ] Hero search: `max-w-page shadow-[0_4px_30px_rgba(0,0,0,0.06)] rounded-full bg-surface-container flex items-center p-sm` with leading `search` icon, `text-headline-md` input, and a `bg-primary rounded-full px-lg py-md` Search button.
- [ ] Left rail (`w-64 sticky top-24`, `hidden md:flex`): Categories / Date / Tags groups with the design's `w-4 h-4 rounded-full border border-outline` radio dots and tag pills. Categories and Tags bind to the existing `facets` response; Date is a new client-side `savedAt` filter with Past Week/Month/Year.
- [ ] Results: `grid-cols-1 md:grid-cols-2 gap-md auto-rows-max`, header row "Search Results" + `Showing N matches`, "Load More Results" outline pill that raises the request `limit`.
- [ ] **Preserve unchanged:** 200ms debounce, `mode: "instant"` typeahead, `mode: "full"` search, facet re-run effect, browse-when-empty fallback.
- [ ] Below `md` the filter rail collapses into a `Dialog` opened by a Filters button — required for responsiveness.
- [ ] Verify: typeahead, facet toggling, and empty/no-match states all still work.

---

### Task 7: Chat pages

**Files:** `chat/chat-panel.tsx`, `chat/chat-sidebar.tsx`, `chat/chat-message.tsx`, `chat/chat-composer.tsx`, `app/(app)/chat/page.tsx`, `app/(app)/chat/[threadId]/page.tsx`

**Design reference:** `chat_lyvora` lines 4–164.

- [ ] Shell: `h-[calc(100vh-64px)] overflow-hidden`, `w-80` left rail (`border-r border-outline-variant/30 bg-surface-container-lowest`), main column `bg-surface-bright` with the two blurred ambient blobs at `opacity-30`.
- [ ] Left rail: full-width `New Conversation` primary pill routing to `/chat`; Suggestions block rendering the existing `EXAMPLE_PROMPTS` as cards with the hover accent bar; Recent Threads list bound to the existing `threads` prop with `formatRelativeDate`.
- [ ] Messages: user bubble `bg-primary-container text-on-primary-container rounded-2xl rounded-tr-sm p-md` with hover-revealed avatar; assistant bubble `bg-surface-container-lowest rounded-2xl rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-outline-variant/20` preceded by the `smart_toy` primary circle; "Referenced Memories" grid rendered from the existing `[memory:uuid]` citation extraction; action row (thumb_up / thumb_down / content_copy) — copy wires to the clipboard, feedback buttons toggle local state only.
- [ ] Typing indicator matches the design: `Searching memory graph...` + `animate-[progress_1.5s_ease-in-out_infinite]` bar, shown while `status` is `submitted`/`streaming`.
- [ ] Composer: glassmorphic `rounded-[2rem]` container with attach button, auto-growing textarea capped at 150px, send button with `hover:scale-105 active:scale-95`; Enter sends, Shift+Enter newlines. The "Context: Global Memory" hint appears on focus.
- [ ] **Preserve unchanged:** `DefaultChatTransport`, `X-Thread-Id` handling, `sessionStorage` redirect to the new thread, citation hydration via `/api/memories`, `router.refresh()`.
- [ ] Below `lg` the rail collapses behind a "Threads" button.
- [ ] Verify: send a message, stream a reply, citations hydrate, new thread redirects.

---

### Task 8: Knowledge graph

**Files:** `packages/core/src/graph/entity-graph.ts`, `packages/core/src/index.ts`, `app/api/graph/entity/[entityId]/route.ts`, `graph/graph-explorer.tsx`, `graph/graph-canvas.tsx`, `graph/use-force-layout.ts`, `graph/entity-detail-panel.tsx`, `app/(app)/graph/page.tsx`, `app/(app)/graph/[entityId]/page.tsx`

**Design reference:** `graph_lyvora` lines 4–133. The design's static SVG uses invalid `translate(50%, 50%)` transforms, so positions must be computed; everything else (panel chrome, colors, radii, interactions) is replicated exactly.

**Produces:** `listEntityGraph(userId, limit?): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>` where `GraphNode = { id, name, kind, mentionCount }` and `GraphEdge = { source, target, weight }` derived from entities co-occurring in the same memory (`memory_entities` self-join, weight = shared memory count).

- [ ] Add the core query with the same `createServiceDbClient()` + `userId` scoping as its neighbours in `graph/queries.ts`.
- [ ] `use-force-layout.ts`: dependency-free deterministic simulation (repulsion + spring + centering, fixed iteration count, seeded by node index) returning stable `{x, y}` — no new packages.
- [ ] `graph-canvas.tsx`: SVG with pan (pointer drag), zoom (wheel + the `add`/`remove`/`fit_screen` buttons), edges at `text-outline-variant/30`, node radius scaled by `mentionCount`, node fill/stroke by entity kind using the design's `#f97316` / `#3b82f6` / `#10b981` / `fill-surface-container-high` set, `hover:scale-110` and keyboard focus per node.
- [ ] Floating panels: top-right search box + Filter Graph chips (`All Entities` active as `bg-primary-container text-on-primary-container`); bottom-center hint pill `bg-surface-container-high/80 backdrop-blur-md`; bottom-right zoom stack.
- [ ] `entity-detail-panel.tsx`: right `w-96` panel sliding via `translate-x-full`, showing kind dot + name, AI summary (derived from the top linked memory's `tldr`), Connected Memories count badge and cards, and an "Explore Entity Deep Dive" button linking to `/graph/[entityId]`. Data comes from the new API route.
- [ ] `/graph/[entityId]` keeps `getEntityPage` and is restyled with the design system.
- [ ] Fix the pre-existing missing `Link` import while rewriting `graph/page.tsx`.
- [ ] Empty state when the user has no entities.
- [ ] Verify: nodes render from real entities, click opens the panel, deep dive navigates.

---

### Task 9: Memory detail page

**Files:** `memory/memory-hero.tsx`, `memory/ask-about-memory-bar.tsx`, `memory/payload-renderer.tsx`, `app/(app)/memory/[id]/page.tsx`

**Design reference:** `memory_detail_lyvora` lines 4–147.

- [ ] Two-column `flex-col lg:flex-row gap-xl` inside `max-w-page px-lg py-xl`.
- [ ] Hero: left category-colored `4px` rail, category chip + source link (`open_in_new` + `site_name`), `text-display-lg` title, and a meta row. The design's "Prep Time / Servings" pair is generalised: render up to two facts pulled from `structured` (recipe -> total time & servings; product -> brand & price; workout -> frequency; travel -> best season & budget) and omit the row entirely when none exist.
- [ ] Featured media `h-[400px] rounded-xl shadow-md` rendered only when `hero_image_url` is present.
- [ ] "AI Synthesis" section (`bg-surface-container-lowest p-lg rounded-xl` + `auto_awesome`) bound to `summary`, falling back to `tldr`. Key points render as the design's structured-payload chip grid.
- [ ] "Original Source Snippet" `border-l-4 border-outline-variant` blockquote bound to a trimmed `raw_text` excerpt, omitted when absent.
- [ ] Sidebar: Actions card (Add Note -> existing note flow, Share Memory -> `navigator.share` with clipboard fallback) and Related Memories using the compact card + the existing `relatedMemories` data.
- [ ] Fixed "Ask AI about this memory…" bar posts to `/chat` with the question prefilled — no new backend.
- [ ] **Preserve unchanged:** `recordMemoryView`, duplicate-of banner, original-file download link, `PayloadRenderer` output.
- [ ] Verify: a recipe, a web article, and a PDF memory all render without empty sections.

---

### Task 10: Weekly report page

**Files:** `report/stat-card.tsx`, `report/category-donut.tsx`, `report/insight-list.tsx`, `report/focus-card.tsx`, `app/(app)/report/page.tsx`

**Design reference:** `weekly_report_lyvora` lines 4–264.

- [ ] Header: `[WR-####]` id (derived from `report.id`), pulsing dot, week range from `weekStart`/`weekEnd`, `display-lg` "Weekly Synthesis", and the narrative sentence with `savedThisWeek` and the top two categories inlined as tinted chips. Export PDF button calls `window.print()` with a print stylesheet.
- [ ] Stats grid `grid-cols-2 lg:grid-cols-4 gap-md` mapping to `savedThisWeek` (+ `savedDelta` badge), `growth.totalEdges`, `topCategories.length`, and a rediscovery percentage derived from `neverRevisitedCount` vs `growth.totalMemories`.
- [ ] `category-donut.tsx`: pure SVG stroke-dasharray donut (circumference 251.2 at r=40, `stroke-width 16`, `-rotate-90`) computed from `topCategories`, with the legend + percentage bars beside it. Segment colors come from `lib/categories.ts`.
- [ ] Synthesized Insights renders `narrative` sentences / `emergingTags`; Rediscover column renders `recommendedRevisits`; the `bg-primary-container` "Next Week's Focus" card renders the first `stale`/recommendation reason.
- [ ] Keep the existing no-report empty state.
- [ ] Verify: page renders with a real report row and with `report === null`.

---

### Task 11: Settings, auth, marketing, error and loading states

**Files:** `app/(app)/settings/page.tsx`, `settings/capture-helpers.tsx`, `app/(auth)/layout.tsx`, `app/(auth)/sign-in/page.tsx`, `sign-in/magic-link-form.tsx`, `sign-in/google-sign-in-button.tsx`, `app/page.tsx`, `app/(app)/error.tsx`, `app/(app)/not-found.tsx`, `app/not-found.tsx`, `components/coming-soon.tsx`, new `loading.tsx` files per route

**These pages have no design file**, so they are built from the same design system (rule 5).

- [ ] Settings: `PageContainer` + `display-lg`-scale heading, `bg-surface-container-lowest rounded-xl shadow-sm` section cards, restyled `CaptureHelpers` steps, account card with email + sign-out. Preserve the bookmarklet/shortcut clipboard logic.
- [ ] Auth: light card `bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]`, brand logo lockup, primary/outline buttons. Preserve `useActionState` magic-link flow, Google action, and error codes.
- [ ] Marketing page restyled to the light palette with the design's card treatment for the product mock. Preserve the `getAuthenticatedUser()` redirect.
- [ ] Add `loading.tsx` skeletons per app route using `<Skeleton>`, matching each page's grid.
- [ ] Verify: sign-in -> magic link -> `/home` round trip unaffected.

---

### Task 12: Cleanup and verification

- [ ] `rg` for stale tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-accent`, `text-destructive`) and replace every remaining hit with a design token; then delete the legacy aliases from `tailwind-theme.css`.
- [ ] `rg "lucide-react"` — confirm no icon imports remain in `apps/web`.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm build`; fix all findings.
- [ ] Manual pass at 390 / 768 / 1024 / 1440 px on every route.

---

## Self-Review

**Spec coverage.** Component conversion -> Task 2 + the composites in 4–10. Design system extraction -> Task 1. Responsiveness -> the `<lg` clauses in Tasks 3, 6, 7. Assets -> Task 1 (logo) and `hero_image_url` in Tasks 4/9. Functional integration -> the "Preserve unchanged" bullets in Tasks 5–11. Animations -> Task 1 keyframes plus per-component hover/transition classes. Missing-page handling -> Task 11. Missing-design handling -> Task 8's detail panel and Task 6's mobile filter dialog.

**Known data gaps and their resolutions.** The design invents "Prep Time / Servings", "Referenced Memories", per-node entity categories, and a "Rediscovery Score". Tasks 9, 7, 8 and 10 each state the real field the element binds to, or state that it is omitted when no data exists. No element is left hardcoded.

**Type consistency.** `getCategoryStyle`, `MaterialIcon`/`IconName`, `PageContainer`, `formatRelativeDate`, `listEntityGraph`/`GraphNode`/`GraphEdge` are defined once in Tasks 1–4 and 8 and referenced under those exact names everywhere after.
