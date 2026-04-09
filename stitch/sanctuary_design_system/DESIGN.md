# Design System Specification: The Reverent Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Sanctuary"**

This design system moves away from the utilitarian, "software-as-a-service" aesthetic often found in management tools. Instead, it adopts a **High-End Editorial** approach. We treat digital management as a sacred act of stewardship. The system prioritizes "The Digital Sanctuary"—a space that feels calm, authoritative, and expansive. 

By leveraging intentional asymmetry, overlapping elements, and extreme tonal depth, we break the "template" look. This isn't just a dashboard; it’s a curated experience that uses generous white space as a breathing lung for the community’s data.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, authoritative Blue and a radiant, celestial Gold. However, the sophistication lies in the transition between these tones.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts or tonal transitions. To separate the sidebar from the main stage, use `surface-container-low` against `surface`. To separate a card, use `surface-container-lowest` on top of `surface-container`.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f9f9f9)
*   **De-emphasized Sections:** `surface-container-low` (#f3f3f4)
*   **Elevated Content Blocks:** `surface-container-lowest` (#ffffff)
*   **Active/Navigation Overlays:** `surface-container-high` (#e8e8e8)

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" feel, use **Glassmorphism** for floating elements (like dropdowns or sticky headers). 
*   **Token:** `surface-container-lowest` at 80% opacity with a `20px` backdrop blur.
*   **Signature Textures:** Apply a subtle linear gradient to Hero sections transitioning from `primary` (#00236f) to `primary-container` (#1e3a8a) at a 135-degree angle. This adds a "soul" to the interface that flat hex codes cannot achieve.

---

## 3. Typography
We utilize a high-contrast scale to create an editorial rhythm.

*   **Display (Inter Bold):** Use `display-lg` (3.5rem) for high-impact welcome messages. Tighten letter spacing by -0.02em to give it an authoritative, "printed" feel.
*   **Headlines (Inter Bold):** Use `headline-md` (1.75rem) for section headers. These should often be placed asymmetrically to lead the eye.
*   **Body (Plus Jakarta Sans):** Chosen for its modern, open counters. Use `body-lg` (1rem) for general reading to ensure accessibility and "breathability."
*   **Labels (Plus Jakarta Sans):** Use `label-md` (0.75rem) in All Caps with +0.05em letter spacing for a premium, navigational feel.

---

## 4. Elevation & Depth
In this design system, depth is earned, not forced.

*   **The Layering Principle:** Stacking is our primary tool. A `surface-container-lowest` card sitting on a `surface-container-low` background creates a natural, soft lift.
*   **Ambient Shadows:** If a floating state is required (e.g., a Modal), use an extra-diffused shadow: `0px 24px 48px rgba(0, 35, 111, 0.06)`. Note the tint—the shadow uses a hint of our `primary` color rather than neutral black to maintain "Digital Sanctuary" warmth.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#c5c5d3) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background, `on-primary` text. `xl` (1.5rem) roundedness. Use a subtle 2px bottom "inner-shadow" to give a tactile, pressed-paper feel.
*   **Secondary:** `secondary-fixed` (#ffe083) background. This is our "Golden Thread" for CTAs that require attention without the weight of the Blue.
*   **Tertiary:** Ghost style. No background, `primary` text.

### Input Fields
*   **Styling:** `surface-container-lowest` background with a `sm` (0.25rem) ghost border.
*   **Focus State:** Shift the border to `secondary` (#735c00) at 100% opacity. Avoid the standard "blue glow" of browsers.

### Cards & Lists
*   **Constraint:** **Divider lines are forbidden.** 
*   **Method:** Separate list items using the `spacing-4` (1.4rem) scale. For card-based lists, use a 2-column staggered grid (asymmetric) to maintain the editorial feel.

### Church-Specific Components
*   **The "Sermon Glass" Player:** A glassmorphic audio player pinned to the bottom of the screen using `surface-container-lowest` at 70% opacity with heavy backdrop blur.
*   **Ministry Chips:** Use `secondary-container` (#fed01b) for tags to highlight different church groups (Youth, Outreach, Worship).

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. If a container has `spacing-12` on the left, try `spacing-16` on the right to create a "custom-built" look.
*   **Do** use the `20` (7rem) spacing token for major section gaps. Generous white space is a core brand value.
*   **Do** use `headline-lg` for numeric data (e.g., Attendance, Giving) to make the data feel like a celebration.

### Don’t:
*   **Don’t** use "Card Shadows" by default. Use color-tier shifting instead.
*   **Don’t** use pure black (#000000) for text. Always use `on-surface` (#1a1c1c) to keep the contrast "soft-premium."
*   **Don’t** use standard "Success Green" for primary actions. Only use `success` (#22c55e) for confirmed states (e.g., "Donation Received").