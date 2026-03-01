# Risk Assessments Design System

> **AI Risk Assessment Tool**
>
> Design reference for the Risk Assessments module — standalone tool and future Complio module.
> Last updated: 2026-03-01

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Patterns](#component-patterns)
6. [Relationship to Complio](#relationship-to-complio)

---

## Brand Identity

| Attribute   | Value                                                  |
| ----------- | ------------------------------------------------------ |
| **Name**    | Risk Assessments                                       |
| **Purpose** | AI system risk assessment (EU AI Act compliance)       |
| **Spirit**  | Authoritative, structured, clear, regulatory-grade     |
| **Tech**    | Next.js 16 + Tailwind v4 + Supabase cloud + Recharts   |

### Brand Personality

- **Authoritative** — Regulatory tooling must command trust and confidence.
- **Structured** — Dense information presented with clarity and hierarchy.
- **Clear** — Complex risk scoring made legible and actionable.
- **Regulatory-grade** — Professional enough for enterprise and compliance contexts.

---

## Color Palette

Risk Assessments uses a distinct **Informatica-inspired** palette — independent from Complio's EU Blue.
Defined in `src/app/globals.css` using Tailwind v4 `@theme`.

### Brand Colors (Informatica Orange)

| Token                | Hex       | Usage                                             |
| -------------------- | --------- | ------------------------------------------------- |
| `--color-brand`      | `#E23400` | Primary brand. CTAs, active states, highlights.   |
| `--color-brand-light`| `#FFF5F2` | Lightest tint, hover backgrounds                  |
| `--color-brand-mid`  | `#FFE0D6` | Mid tones, decorative fills                       |
| `--color-brand-hover`| `#C02E00` | Hover/active on primary                           |
| `--color-brand-dark` | `#8B1F00` | Pressed state, deep emphasis                      |

### Navigation Colors (Dark Blue)

| Token              | Hex       | Usage                        |
| ------------------ | --------- | ---------------------------- |
| `--color-nav-bg`   | `#0047BA` | Navigation bar background    |
| `--color-nav-hover`| `#1E397C` | Nav item hover state         |

### Accent

| Token            | Hex       | Usage                               |
| ---------------- | --------- | ----------------------------------- |
| `--color-accent` | `#12C2E5` | Data visualisation, secondary links |

### Surface Colors

| Token                         | Hex       | Usage                   |
| ----------------------------- | --------- | ----------------------- |
| `--color-surface-bg`          | `#F8F9FA` | Page background (cool)  |
| `--color-surface-card`        | `#FFFFFF` | Card background         |
| `--color-surface-border`      | `#e2e0dc` | Default borders         |
| `--color-surface-border-light`| `#f0ede8` | Subtle dividers         |

### Text Colors

| Token                  | Hex       | Usage                    |
| ---------------------- | --------- | ------------------------ |
| `--color-text-primary` | `#101820` | Body text (near-black)   |
| `--color-text-muted`   | `#63666A` | Secondary/meta text      |
| `--color-text-light`   | `#94a3b8` | Placeholders, hints      |

### Status Colors

| Token                       | Hex       | Risk Level Mapping       |
| --------------------------- | --------- | ------------------------ |
| `--color-status-green`      | `#059669` | Low risk / compliant     |
| `--color-status-green-light`| `#ECFDF5` | Low risk background      |
| `--color-status-amber`      | `#D97706` | Limited / medium risk    |
| `--color-status-amber-light`| `#FFFBEB` | Medium risk background   |
| `--color-status-red`        | `#DC2626` | High / unacceptable risk |
| `--color-status-red-light`  | `#FEF2F2` | High risk background     |
| `--color-status-blue`       | `#2563EB` | Informational / neutral  |
| `--color-status-blue-light` | `#EFF6FF` | Info background          |

---

## Typography

| Attribute   | Value                                          |
| ----------- | ---------------------------------------------- |
| **Primary** | Roboto (Google Fonts, loaded via next/font)    |
| **Fallback**| ui-sans-serif, system-ui, sans-serif           |

Applied via `--font-sans: var(--font-roboto)` in `@theme inline`.

Roboto is used for its legibility at dense information density — appropriate for regulatory/compliance contexts.

### Type Hierarchy

| Role            | Recommended classes                        |
| --------------- | ------------------------------------------ |
| Page title      | `text-2xl font-bold text-text-primary`     |
| Section heading | `text-lg font-semibold text-text-primary`  |
| Card title      | `text-base font-medium text-text-primary`  |
| Body            | `text-sm text-text-primary`                |
| Risk label      | `text-xs font-semibold uppercase tracking-wide` |
| Meta / caption  | `text-xs text-text-muted`                  |

---

## Spacing & Layout

- **Base unit**: 4px (Tailwind default)
- **Page padding**: `px-4 sm:px-6 lg:px-8`
- **Card radius**: `rounded-xl`
- **Card shadow**: `0 1px 3px rgba(30, 58, 95, 0.08)`
- **Table rows**: compact, `py-2 px-3` cells
- **Charts**: Recharts, uses accent (`#12C2E5`) + status palette for series colours

---

## Component Patterns

### Risk Score Badges

Map EU AI Act risk levels to status tokens:

| Level            | Background                  | Text      |
| ---------------- | --------------------------- | --------- |
| Unacceptable     | `status-red-light`          | `status-red` |
| High             | `status-amber-light`        | `status-amber` |
| Limited          | `status-blue-light`         | `status-blue` |
| Minimal          | `status-green-light`        | `status-green` |

### Navigation Bar

- Background: `nav-bg` (`#0047BA`)
- Hover: `nav-hover` (`#1E397C`)
- Text: white
- Active indicator: `brand` (`#E23400`) underline or left border

### Data Tables

Risk assessment data is dense. Use:
- `text-sm` for cell content
- `text-xs font-semibold uppercase` for headers
- Alternating row bg: `bg-surface-bg` / `bg-surface-card`
- Sort/filter controls: `text-text-muted hover:text-text-primary`

### Charts (Recharts)

Primary series colour: `--color-accent` (`#12C2E5`)
Additional series: status colours (`green`, `amber`, `red`, `blue`)
Background: `--color-surface-bg`
Grid lines: `--color-surface-border`

---

## Relationship to Complio

Risk Assessments is architected as both a standalone tool and a candidate Complio module.

| Aspect          | Risk Assessments               | Complio                      |
| --------------- | ------------------------------ | ---------------------------- |
| Brand palette   | Informatica Orange `#E23400`   | EU Blue `#003399`            |
| Nav color       | Dark Blue `#0047BA`            | EU Blue `#003399`            |
| Surface         | Cool white `#F8F9FA`           | Warm parchment `#fdfaf6`     |
| Font            | Roboto                         | DM Sans + Plus Jakarta Sans  |
| Component lib   | Custom Tailwind v4             | Custom Tailwind v4           |
| Database        | Supabase cloud                 | Supabase cloud               |
| Auth            | Supabase auth                  | Supabase auth (multi-tenant) |
| Shared          | Status token values + spacing  | Structural patterns only     |

When integrated into Complio as a module, the Risk Assessments UI will adopt Complio's palette and typography, with assessment-specific status colours retained.
