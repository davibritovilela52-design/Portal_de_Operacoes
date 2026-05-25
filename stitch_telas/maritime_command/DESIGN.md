---
name: Maritime Command
colors:
  surface: '#081425'
  surface-dim: '#081425'
  surface-bright: '#2f3a4c'
  surface-container-lowest: '#040e1f'
  surface-container-low: '#111c2d'
  surface-container: '#152031'
  surface-container-high: '#1f2a3c'
  surface-container-highest: '#2a3548'
  on-surface: '#d8e3fb'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#d8e3fb'
  inverse-on-surface: '#263143'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#c5cce6'
  on-tertiary: '#283044'
  tertiary-container: '#a9b1ca'
  on-tertiary-container: '#3c4459'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#081425'
  on-background: '#d8e3fb'
  surface-variant: '#2a3548'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  panel-gap: 12px
  stack-tight: 4px
  stack-md: 16px
  grid-columns: '12'
  max-width: 1600px
---

## Brand & Style
The design system is engineered for the high-stakes environment of yacht operations, where technical precision and operational reliability are paramount. The aesthetic follows a **"Glass and Steel"** philosophy—a refined blend of Corporate Modernism and subtle Glassmorphism that reflects the architectural quality of luxury vessels and the cold efficiency of maritime hardware.

The interface must evoke a sense of calm authority. It avoids the playfulness of consumer SaaS in favor of a "command-center" atmosphere: dark, focused, and data-dense. Visual hierarchy is established through luminous accents against deep, structural foundations, ensuring that critical safety and compliance data are immediately recognizable in high-pressure scenarios.

## Colors
The palette is built on a foundation of deep maritime tones. 
- **Foundations:** Use `#0F172A` for the primary canvas and `#1E293B` for structural panels and containers to create a layered "steel" effect.
- **Primary Action:** A crisp technical blue (`#38BDF8`) is reserved for interactive elements, focus states, and primary navigation.
- **Semantic Urgency:** High-visibility saturations are used for safety-critical information. Use "Urgent Red" (`#F43F5E`) for SLA breaches and safety alerts, and "Emerald" (`#10B981`) for confirmed compliance status.
- **Interactive Surfaces:** Use subtle transparencies (10-20% opacity) of secondary slates to create the "glass" overlay effect without sacrificing legibility.

## Typography
This design system prioritizes data density and rapid scanning. **Inter** serves as the primary typeface for its exceptional legibility in complex layouts. 

- **Numerical Data:** For coordinates, timestamps, and technical values, use **JetBrains Mono** to ensure character distinction (e.g., 0 vs O) and tabular alignment.
- **Hierarchy:** Use `label-caps` for section headers and metadata labels to maximize vertical space.
- **Density:** Body text is sized at 14px and 13px to allow for high-information density without compromising the "premium" feel.

## Layout & Spacing
The layout employs a **12-column fixed-fluid hybrid grid** optimized for ultra-wide desktop monitors.
- **Grid Strategy:** Use a 12px gutter to maintain high data density while providing enough visual "air" between discrete operational modules.
- **Padding:** Internal module padding should be consistent at 16px to keep information grouped tightly but legibly.
- **Breakpoints:** The primary experience is anchored at 1440px. On screens wider than 1600px, content centers with expansive side margins to maintain focus.
- **Panels:** Use a modular "widget" approach where critical information panels (Engine Status, Weather, Crew) can be rearranged but maintain a strict 4px-base alignment.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Reflective Outlines** rather than traditional shadows.
- **Surface Tiers:** The base canvas is the darkest. Each level of elevation (e.g., a modal over a panel) is represented by a slightly lighter slate hex.
- **Outlines:** Elements use 1px solid borders (`#FFFFFF` at 10% opacity) to simulate the edge of a glass pane. 
- **Luminance:** Interactive elements and status indicators use a "subtle glow"—a drop shadow with 0px offset, 8px blur, and 30% opacity of the element's primary color—to simulate light emitting from a high-tech console.

## Shapes
The shape language is "Soft-Industrial." Components use a disciplined 4px (`0.25rem`) corner radius. This provides a precision-machined feel that is more approachable than sharp 90-degree angles but maintains a more serious, technical profile than fully rounded UI. 

Status badges and SLA indicators may use a slightly higher radius (8px) to differentiate them as "tappable" or "dynamic" status elements against the more rigid structural panels.

## Components
- **Status Chips:** Small-scale indicators with a light-bleed effect. The background should be a desaturated version of the status color (e.g., Dark Red at 15%) with a high-contrast label and a 2px "active" dot.
- **Severity Badges:** Components used for SLA warnings. These must have a 1px border of the semantic color to ensure visibility against dark panel backgrounds.
- **SLA Indicators:** Use thin (4px) horizontal progress bars. For urgent breaches, the bar should pulse or "shimmer" to draw immediate visual attention.
- **Command Inputs:** Input fields should use a dark background (`#0F172A`) with a subtle inner-glow on focus to reinforce the "Glass" metaphor.
- **Data Tables:** Strict row-based layouts with high-contrast headers. Zebra-striping is replaced by a 1px border-bottom (`#FFFFFF` at 5% opacity) to keep the look clean and professional.
- **Technical Gauges:** Circular or linear indicators for engine/fuel stats should use the primary technical blue with a semi-transparent track.