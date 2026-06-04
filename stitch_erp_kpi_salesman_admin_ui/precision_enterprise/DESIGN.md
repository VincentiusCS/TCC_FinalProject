---
name: Precision Enterprise
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fc'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1eb'
  on-surface: '#1a1b22'
  on-surface-variant: '#444653'
  inverse-surface: '#2f3037'
  inverse-on-surface: '#f1f0fa'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1eb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar_expanded: 260px
  sidebar_collapsed: 72px
  header_height: 64px
  gutter: 24px
  stack_sm: 8px
  stack_md: 16px
  stack_lg: 24px
---

## Brand & Style
The design system is engineered for the high-stakes environment of automotive ERP management. It prioritizes clarity, efficiency, and industrial-grade reliability. The brand personality is authoritative yet unobtrusive, ensuring that complex data remains the focal point. 

The aesthetic follows a **Corporate Modern** approach. It leverages a structured grid, generous white space to prevent cognitive overload, and a disciplined color palette. Every visual element serves a functional purpose, evoking a sense of systematic precision and trust necessary for enterprise-scale operations.

## Colors
The palette is rooted in a deep, trustworthy blue that signifies stability and corporate heritage. The background uses a soft light gray to reduce eye strain during long working sessions, while white is reserved for high-priority "workspace" surfaces like cards and data tables.

Semantic colors are strictly applied to functional states:
- **Emerald Green**: Indicates active production lines, successful syncs, or positive inventory delta.
- **Rose Red**: Reserved for critical system errors, stock-outs, or deletion confirmations.
- **Amber Orange**: Used for maintenance warnings, low-stock thresholds, or pending approvals.

## Typography
This design system utilizes **Inter** across all levels to maintain a clean, systematic look. The type scale is optimized for high information density, favoring smaller, highly legible body text (14px) for data tables and forms.

For mobile devices, `headline-xl` should scale down to 24px and `headline-lg` to 20px to ensure headers do not consume excessive vertical real estate. Line heights are kept tight but breathable to maintain vertical rhythm in dense dashboards.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. A global sidebar navigation persists on the left, providing the primary app hierarchy, while a top header bar handles global search, notifications, and user profile actions.

- **Desktop**: 12-column fluid grid for the main content area with 24px gutters. The content area sits on the light gray background, with data components housed in white cards.
- **Tablet**: Sidebar collapses automatically to the 72px icon-only state. Margins reduce to 16px.
- **Mobile**: Sidebar transitions to a hidden drawer. The layout becomes a single-column stack. Content padding is reduced to 12px to maximize screen utility.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** supplemented by low-opacity ambient shadows. The system uses three primary levels of elevation:
1. **Base**: The `neutral_background` (#f3f4f6).
2. **Surface**: Pure white cards and containers which use a subtle 1px border (#e5e7eb) and a very soft shadow (0px 1px 3px rgba(0,0,0,0.1)).
3. **Overlay**: Modals, dropdowns, and flyouts use a more pronounced shadow (0px 10px 15px rgba(0,0,0,0.1)) to indicate they sit high above the interface.

Avoid heavy blurs or vibrant glows to maintain the professional, utilitarian atmosphere.

## Shapes
The design system employs a **Soft** shape language (Level 1). A 4px base radius (0.25rem) is applied to buttons, input fields, and small UI components. Larger containers like cards utilize an 8px radius (0.5rem).

This slight rounding softens the industrial feel without appearing informal, striking a balance between modern software aesthetics and traditional corporate reliability. Status badges use a slightly higher radius (12px) to distinguish them as distinct pill-shaped identifiers.

## Components
- **Data Tables**: The core of the ERP. Rows should have a 48px minimum height. Use alternating "zebra" striping or subtle hover states to guide the eye. Row actions (edit/view/delete) should be grouped in the final column, visible on hover or behind a "more" icon.
- **Status Badges**: Small, high-contrast labels using the semantic palette. Text should be uppercase `label-sm` for maximum scan-ability.
- **Form Fields**: Labels must be top-aligned for readability. Use a 1px border that shifts to the `primary_color_hex` on focus.
- **Buttons**:
    - *Primary*: Solid Blue (#1e40af) with White text.
    - *Secondary*: White background with a Gray border and Blue text.
    - *Tertiary*: Text-only for low-priority actions.
- **Sidebar**: The expanded state shows the logo and text labels; the collapsed state shows only icons. The active state is indicated by a vertical 4px blue bar on the left edge of the menu item.
- **Cards**: Use white backgrounds to isolate specific data modules (e.g., "Active Orders," "Stock Alerts"). Cards should have a 24px internal padding.