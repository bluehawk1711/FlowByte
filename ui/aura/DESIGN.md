---
name: Aura
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  h1:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  h2:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  h3:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  song-title:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  artist-name:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  huge: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is anchored in a philosophy of **Atmospheric Minimalism**. It targets a discerning audience of music enthusiasts who value focus, clarity, and a premium aesthetic. The emotional goal is to evoke a sense of late-night immersion—calm, focused, and sophisticated.

The visual style is **Modern Corporate with a Tonal Layering** approach. It avoids the trendiness of glassmorphism in favor of "Physical Dark Mode," where depth is communicated through subtle shifts in charcoal values rather than transparency. The interface should feel like high-end hi-fi equipment: precise, tactile, and understated. Whitespace is used generously to let album art provide the primary visual color and energy.

## Colors

The palette is built on a "Deep Charcoal" foundation to reduce eye strain and provide a high-contrast canvas for content.

- **Background Base**: A near-black charcoal used for the lowest level of the UI.
- **Primary Accent**: Electric Violet (#8B5CF6) is reserved for high-intent actions (Play, Active States, Selection).
- **Secondary Accent**: Deep Teal is used for success states or subtle secondary highlights like "Verified Artist" badges.
- **Tonal Logic**: UI surfaces "lift" closer to the user by becoming lighter. Use `surface_low` for sidebars and `surface_medium` for cards and modals.
- **Contrast**: Primary text must remain near-white (#F8FAFC) for maximum legibility against dark backgrounds, while metadata uses a muted slate to maintain hierarchy.

## Typography

This design system utilizes **Hanken Grotesk** for its contemporary, sharp geometric qualities that bridge the gap between technical precision and human warmth.

- **Hierarchy**: Use `display-lg` for immersive album headers and artist profiles. `song-title` uses a medium weight to stand out in lists, while `artist-name` is always one step smaller and muted in color.
- **Labels**: Small labels (e.g., duration, timestamps, category tags) should use `label-sm` with uppercase transformation and slight letter-spacing for a professional, "instrument-panel" feel.
- **Rendering**: Ensure `text-rendering: optimizeLegibility` is enabled to maintain the sharpness of the geometric sans-serif on dark backgrounds.

## Layout & Spacing

The system uses a strict **4px baseline grid** to ensure mathematical harmony.

- **Desktop Layout**: A three-zone sidebar model. 
  - *Zone 1 (Left)*: Global navigation and library (Fixed, 280px).
  - *Zone 2 (Center)*: Fluid scrollable content area.
  - *Zone 3 (Right)*: Contextual "Now Playing" or "Social" panel (Fixed, 320px).
- **Mobile Layout**: A fluid grid with 16px side margins and a persistent 64px bottom navigation bar.
- **Rhythm**: Use `lg` (24px) for the gap between sections and `sm` (8px) for internal component spacing (e.g., icon to text).

## Elevation & Depth

This design system uses **Tonal Layering** supplemented by subtle **inner-glows** rather than drop shadows.

- **Level 0 (Base)**: `#0B0E14` - The canvas.
- **Level 1 (Cards/Sidebar)**: `#161B22` - Used for primary containers.
- **Level 2 (Popovers/Modals)**: `#1F2937` - The highest level, featuring a subtle 1px border of `#334155` to define the edge against dark backgrounds.
- **Interactive States**: Hovering over a list item or card should trigger a background shift to a slightly lighter charcoal (`#1E293B`) rather than a shadow, maintaining a flat, architectural feel.

## Shapes

The shape language is **Rounded**, balancing the technical nature of the app with a friendly, organic touch typical of modern premium hardware.

- **Standard Elements**: Buttons and inputs use `rounded` (8px/0.5rem).
- **Large Elements**: Album cards and bottom sheets use `rounded-lg` (16px/1rem).
- **Play Controls**: The main "Play" button and progress handles should use a full pill-shape (circular) to signify their importance and function as a primary touchpoint.

## Components

- **Buttons**: Primary buttons are solid Electric Violet with white text. Secondary buttons are "Ghost" style—transparent background with a subtle slate border.
- **Custom Sliders**: 
  - *Track*: 4px height, background `#1E293B`.
  - *Progress*: Electric Violet.
  - *Handle*: 12px white circle, appearing only on hover to maintain a clean look during passive listening.
- **Song Rows**: 56px height. Left-aligned thumbnail (40px, 4px radius), followed by Title (Primary Text) and Artist (Secondary Text). Use a skeleton state with a subtle pulse animation for loading.
- **Cards**: Album cards use a 1:1 aspect ratio for imagery. Titles are placed below the image with a maximum of 2 lines. Use `rounded-lg` for the image container.
- **Bottom Sheets**: Used on mobile for "More Options." Sheets should have a visible drag handle and a soft backdrop dimming effect (60% opacity).
- **Bottom Navigation**: 64px height, frosted background (10% opacity white blur) to provide a hint of depth without the clutter of a solid border.