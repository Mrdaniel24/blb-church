# Design System Master File — BLB Church

> **LOGIC:** When building a specific page, first check `design-system/blb-church/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** BLB Church — The Digital Sanctuary
**Style Name:** The Reverent Editorial
**Generated:** 2026-04-16
**Category:** Church / Religious Organization / Community Platform
**Stack:** html-tailwind (Tailwind CDN, no build step)

---

## Brand Identity

BLB Church uses a deep navy + gold editorial palette — authoritative, warm, and welcoming.
All monetary values display in **TZS** using `formatTZS()` from `supabase-client.js`.

---

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#00236f` | Nav, headings, buttons, icon fills |
| Primary Container | `#1e3a8a` | Hover states, dark card backgrounds |
| On Primary | `#ffffff` | Text on primary backgrounds |
| Secondary / CTA | `#fed01b` | CTAs, badges, accent lines, highlights |
| Secondary Container | `#ffe083` | Muted gold, hero headline accent |
| On Secondary | `#231b00` | Text on gold backgrounds |
| Gold Muted | `#735c00` | Eyebrow labels, sub-labels on white |
| Surface | `#f9f9f9` | Page background |
| Surface Low | `#f3f3f4` | Section alternates, card backgrounds |
| Surface Container | `#eeeeee` | Borders, dividers |
| On Surface | `#1a1c1c` | Primary body text |
| On Surface Variant | `#444651` | Secondary body text, descriptions |
| Outline | `#757682` | Meta, copyright text |
| Outline Variant | `#c5c5d3` | Subtle borders |
| Error | `#ba1a1a` | Error states |

### Tailwind Config Tokens (already set in every page)

```js
colors: {
  "primary": "#00236f", "primary-container": "#1e3a8a",
  "on-primary": "#ffffff", "on-primary-container": "#90a8ff",
  "secondary": "#735c00", "secondary-container": "#fed01b",
  "on-secondary": "#ffffff", "on-secondary-container": "#6f5900",
  "secondary-fixed": "#ffe083", "on-secondary-fixed": "#231b00",
  "surface": "#f9f9f9", "surface-container-low": "#f3f3f4",
  "surface-container-lowest": "#ffffff", "surface-container": "#eeeeee",
  "on-surface": "#1a1c1c", "on-surface-variant": "#444651",
  "outline-variant": "#c5c5d3", "outline": "#757682",
  "error": "#ba1a1a",
}
```

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headline / Display | Inter | 700–900 | Section titles, hero h1, stat numbers |
| Body / Label | Plus Jakarta Sans | 400–800 | All body copy, nav links, badges, buttons |

### Font Scale

| Element | Size | Weight | Letter-spacing |
|---------|------|--------|----------------|
| Hero H1 | `clamp(2.8rem, 7vw, 6rem)` | 900 | `-0.03em` |
| Section H2 | `clamp(2rem, 4vw, 3rem)` | 900 | `-0.03em` |
| Card H3 | `1.3rem` | 800 | `-0.02em` |
| Eyebrow labels | `0.7rem` | 800 | `0.2em` (uppercase) |
| Nav links | `0.75rem` | 700 | `0.1em` (uppercase) |
| Body copy | `0.875rem–1rem` | 500 | `normal` |
| Stat numbers | `2.75rem` | 900 | `-0.03em` |

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Section padding | `6rem 1.5rem` | All full-width sections |
| Card padding | `2.5rem` | Standard service/feature cards |
| Max content width | `1280px` | Main content container |
| Max CTA width | `1000px` | CTA strip |
| Nav height | `80px` (top) → `68px` (scrolled) | Fixed navbar |

---

## Component Specs

### Buttons

```css
/* Primary CTA — gold pill */
background: #fed01b; color: #231b00;
padding: 1rem 2.25rem; border-radius: 9999px;
font-family: 'Plus Jakarta Sans'; font-size: 0.8rem; font-weight: 800;
letter-spacing: 0.1em; text-transform: uppercase;
transition: transform 0.2s, box-shadow 0.2s;
/* hover: translateY(-3px), box-shadow: 0 18px 40px rgba(254,208,27,0.45) */

/* Primary solid — navy pill */
background: #00236f; color: #ffffff;
/* hover: background #1e3a8a, translateY(-2px) */

/* Ghost — outline navy */
background: transparent; color: #00236f;
border: 2px solid #00236f; border-radius: 9999px;
/* hover: background #00236f, color #ffffff */

/* Hero ghost — frosted */
background: rgba(255,255,255,0.12); color: #ffffff;
border: 1.5px solid rgba(255,255,255,0.3);
backdrop-filter: blur(8px);
```

### Cards (service-card)

```css
background: #ffffff; border-radius: 1.25rem; padding: 2.5rem;
box-shadow: 0 4px 24px rgba(0,35,111,0.06);
transition: transform 0.35s ease, box-shadow 0.35s ease;
/* hover: translateY(-6px), shadow 0 20px 48px rgba(0,35,111,0.14) */
/* ::before bottom border: gradient #00236f → #fed01b, scaleX on hover */
```

### Navbar

- Fixed, transparent at top (`at-top` class)
- Scrolled: `rgba(255,255,255,0.92)` + `backdrop-filter: blur(20px)` (`scrolled` class)
- Logo text: white at top → `#00236f` on scroll
- Nav links: white at top → `#444651` on scroll, gold underline `::after` on hover/active
- CTA button always gold pill

### Gold Divider

```css
.gold-line { width: 3rem; height: 3px; background: #fed01b; border-radius: 2px; }
```
Used under every section H2.

### Reveal Animations

```css
.reveal { opacity: 0; transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease; }
.reveal.visible { opacity: 1; transform: translateY(0); }
/* Delay variants: reveal-delay-1 through reveal-delay-5 (0.1s increments) */
```

---

## Page Sections (public/index.html)

**Section order:**
1. Navbar (fixed)
2. Hero — WebGL plasma shader background, navy brand colors + gold lines
3. Stats Bar — navy bg, member count + ministry count + "100% Welcome"
4. Service Times — alternating light bg, 3 service cards
5. Bento Grid (Insights & Announcements) — featured image + 2 supporting cards
6. About — image stack + editorial quote + body copy
7. CTA Strip — white card with navy + gold shadow on navy bg
8. Footer — 3-column on desktop, links + contact info

---

## Shadow Scale

| Level | Value | Usage |
|-------|-------|-------|
| Card default | `0 4px 24px rgba(0,35,111,0.06)` | Service cards |
| Card hover | `0 20px 48px rgba(0,35,111,0.14)` | Lifted cards |
| CTA card | `0 32px 80px rgba(0,35,111,0.18)` | CTA section |
| About image | `0 32px 64px rgba(0,35,111,0.16)` | Image stack |
| Gold glow | `0 12px 32px rgba(254,208,27,0.35)` | Gold CTA buttons |

---

## Style Guidelines

**Style:** The Reverent Editorial — editorial precision meets spiritual warmth.

**Key Effects:**
- WebGL plasma shader for hero (deep navy + gold animated lines)
- Smooth scroll reveal on all sections (IntersectionObserver)
- Navbar background transition on scroll (transparent → frosted white)
- Bento grid responsive JS (7-col featured + 5-col side on desktop)
- Animated badge dot (pulse) in hero

**Animation rules:**
- Micro-interactions: 150–300ms (`transition: 0.2s–0.35s`)
- Scroll reveal: 650ms ease
- Navbar transition: 300–400ms ease
- All infinite animations must have `prefers-reduced-motion` override

---

## Anti-Patterns (Do NOT Use)

- No purple, lavender, or violet — this is navy + gold only
- No emoji as icons — use Material Symbols Outlined (already loaded)
- No rounded corners larger than `1.25rem` on cards (except pills = `9999px`)
- No arbitrary Tailwind values that break the palette
- No 1px borders between content — use background color shifts instead
- No content flashing — page body starts `opacity:0`, set to `1` after auth check

---

## Auth & Script Loading

Every **protected** page loads scripts in this exact order:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../assets/js/supabase-client.js"></script>
<script src="../assets/js/common.js"></script>
<script src="../assets/js/auth.js"></script>
<script src="../assets/js/router.js"></script>
```

Public pages (index, login, register) only need the first two.

---

## Pre-Delivery Checklist

- [ ] Colors strictly from palette — no purple, no arbitrary values
- [ ] All icons use Material Symbols Outlined (already loaded via CDN)
- [ ] `cursor-pointer` on all interactive cards and buttons
- [ ] Hover states: `translateY(-2px to -6px)` + shadow increase (no layout shift)
- [ ] Transitions: 200–350ms ease
- [ ] `prefers-reduced-motion` check on any continuous animation
- [ ] Page body `opacity:0` → `1` after auth guard on protected pages
- [ ] All user-supplied text goes through `escapeHtml()`
- [ ] Money values formatted with `formatTZS()`
- [ ] Skeleton loaders on all async-loaded sections
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] Eyebrow labels: `0.7rem`, `800` weight, `0.2em` letter-spacing, uppercase, color `#735c00`
- [ ] Section H2 always followed by `.gold-line` divider
