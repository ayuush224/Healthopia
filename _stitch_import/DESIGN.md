# Design System Document: Soft Health Editorial

## 1. Overview & Creative North Star: "The Living Sanctuary"
To move beyond the generic "medical app" aesthetic, this design system is guided by a Creative North Star we call **The Living Sanctuary**.

While traditional health platforms are often clinical and rigid, this system treats the digital interface as a breathing, organic space. We achieve this through **Editorial Asymmetry** and **Tonal Depth**. By utilizing large-scale typography transitions and a "no-line" philosophy, we create an environment that feels less like a database and more like a high-end wellness journal. We prioritize breathing room (negative space) over information density to reduce cognitive load and foster a sense of calm authority.

---

## 2. Colors: Tonal Atmosphere
Our palette moves away from harsh contrasts. Instead, we use a sophisticated range of greens and teals to establish a trustworthy yet energetic atmosphere. The overall interface operates in a **light color mode**, emphasizing clarity and brightness for an uplifting user experience.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment.
Boundaries must be defined solely through background color shifts. For example, a content block using `surface-container-lowest` should sit directly on a `surface-container-low` background. This creates a "soft edge" that feels integrated rather than boxed in.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f8fafb)
*   **Sub-sections:** `surface-container-low` (#f2f4f5)
*   **Elevated Cards:** `surface-container-lowest` (#ffffff)
*   **Interactive Overlays:** `surface-bright` (#f8fafb)

### The "Glass & Signature Texture" Rule
To add a premium feel, use **Glassmorphism** for floating navigation and top bars. Apply a `surface` color at 70% opacity with a `24px` backdrop blur.
*   **Signature Gradient:** For primary CTAs and hero headers, utilize a subtle linear gradient from `primary` (#0f5238) to `primary-container` (#2d6a4f). This adds "soul" and prevents the greens from feeling flat or muddy.

---

## 3. Typography: The Editorial Voice
We use a dual-font strategy to balance character with utility.

*   **Display & Headlines (Manrope):** Chosen for its geometric purity and modern warmth. Use `display-lg` and `headline-lg` with generous tracking (-0.02em) to create an authoritative, editorial feel.
*   **Body & Labels (Inter):** The workhorse for readability. Inter’s tall x-height ensures that wellness data and community posts remain legible even at `body-sm` scales.

**Hierarchy as Identity:** Use extreme scale shifts. A `display-lg` headline paired with a `body-md` description creates an intentional, high-contrast look that feels "designed" rather than "templated."

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor layout. In this system, depth is achieved primarily through **Tonal Stacking**.

*   **The Layering Principle:** Instead of adding a shadow to a card, change the background of the container it sits on. A `surface-container-lowest` card placed on a `surface-container` background provides a natural, soft lift.
*   **Ambient Shadows:** Where floating elements (like FABs or Modals) are required, use "Ambient Shadows."
    *   *Spec:* Blur: 32px | Opacity: 6% | Color: Derived from `on-surface` (#191c1d).
*   **The "Ghost Border" Fallback:** If a layout requires a border for accessibility (e.g., in high-contrast modes), use the `outline-variant` token at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components: Principles of Soft Interaction

### Buttons
*   **Primary:** Uses the Signature Gradient (`primary` to `primary-container`). Corner radius: `xl` (1.5rem/24px) for a "pill" feel that invites touch.
*   **Secondary:** `secondary-container` background with `on-secondary-container` text. No border.
*   **States:** On hover, increase the surface brightness by 5% rather than changing the color entirely.

### Cards & Lists
*   **The Divider Prohibition:** Forbid the use of horizontal divider lines. Use `16px`, `24px`, or `32px` of vertical white space to separate list items.
*   **Visual Grouping:** Group related wellness metrics inside a `surface-container-high` wrapper with `lg` (1rem) rounded corners.

### Inputs & Selection
*   **Input Fields:** Use `surface-container-low` as the field background. On focus, transition to a `Ghost Border` using the `primary` color at 40% opacity.
*   **Chips:** Use `tertiary-container` for health tags (e.g., "Nutrition," "Yoga"). These should have `full` (9999px) rounding to contrast against the `lg` rounding of cards.

### Special Component: The Wellness Progress Ring
A custom component using `primary` for progress and `primary-fixed-dim` for the track. Avoid thin lines; the stroke width should be substantial (8px+) to feel "soft" and accessible.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins (e.g., a wider left margin for headlines) to create an editorial layout.
*   **Do** use `tertiary` (#1c4f51) for deep-set UI elements like footers to ground the experience.
*   **Do** use `xl` (1.5rem) corner radius for large containers to emphasize the "Soft Health" theme.

### Don't:
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#191c1d) to maintain the soft visual profile.
*   **Don't** drop a standard card with a heavy shadow onto a white background. It breaks the "Living Sanctuary" flow.
*   **Don't** use 1px dividers to separate items in a list; use tonal shifts or increased padding.
*   **Don't** crowd the interface. The current **normal spacing** value ensures a balanced and breathable layout, but always lean towards more space if in doubt.