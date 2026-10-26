---
name: invoice-screen-plan
description: Plan for refactoring Invoice Details screen visual styling
metadata:
  type: project
---

## Plan: Invoice Details Screen Refactoring

### Current State
The `InvoiceDetailScreen` at `client/src/app/(owner)/invoice/[id].tsx` has 4 cards with:
- Card 1 (General): rounded-28px, solid red accent bar, BalanceHighlight with red/pink theme
- Card 2 (Line Items): rounded-28px, "4 items" badge, line items with meta-based icons
- Card 3 (Tenant): rounded-28px, circular avatar with "T" letter
- Card 4 (Payment): rounded-28px, oversized button, p-4 padding

### Target Design Overview
- **Overall**: Compact, refined, less padding, smaller gaps, 16px (rounded-2xl) card corners
- **Page bg**: Very light gray (almost white)
- **Card**: white, rounded-2xl (16px), hairline light-gray border, soft shadow, p-4 inner padding
- **Gap between cards**: gap-3 (12px)
- **Screen horizontal padding**: px-4 (12px) — wait, need to check if existing uses px-4

### Card 1: General Information
- **Top accent bar**: 4px tall, gradient red/rose → pink/orange, clipped by rounded corners (overflow-hidden)
- **Header**: "General Information" semibold dark left; OVERDUE pill right: fully rounded, light pink/red bg, thin light red border, small solid red dot + uppercase red text with wide letter spacing
- **4 info rows** (vertical spacing ~12px):
  1. **AMOUNT**: receipt icon, light gray 32px rounded-lg square on left, value "KES 27,650" right
  2. **BALANCE DUE**: special full-width box, bg-amber-50, border-amber-200, p-3 inner padding; left: amber/bg-amber-100 32px rounded-lg square with amber wallet icon; right: uppercase "BALANCE DUE" with wide letter spacing in text-amber-700, below value "KES 27,650" bold text-foreground (NOT red)
  3. **DUE DATE**: calendar icon, same row layout
  4. **UNIT**: home icon, same row layout

### Card 2: Line Items
- **Header**: "Line Items" semibold left; right: rounded-full light gray pill badge "4 items" muted gray
- **Each line item row**: 32px rounded-lg icon tile left + colored icon, middle: title UPPERCASE semibold + description muted gray stacked, right: amount bold right-aligned
- **Icon tile colors**:
  - Rent: bg-green-100, green icon, Home
  - Water: bg-blue-100, blue icon, Droplet
  - Garbage: bg-amber-100, orange/amber icon, Trash2
  - Service charge: bg-indigo-100 (or violet-100), purple icon, Wrench
- **Row dividers**: very faint hairline, ~10px vertical padding per row
- **Footer**: dashed divider (border-dashed, light gray), then single row: "TOTAL DUE" (uppercase, muted gray, slight letter spacing) left + "KES 27,650" (bold, dark) right
- **REMOVED**: Second row showing red "BALANCE DUE" in footer

### Card 3: Tenant Information
- **Title**: "Tenant Information" semibold
- **Two rows**: label left muted gray, value right semibold dark text right-aligned
  - "Tenant" → "Tenant 1"
  - "Billing Period" → "October 2026"
- **REMOVED**: Circular avatar with "T"
- **Hairline divider** between two rows, tighter padding

### Card 4: Record a Payment
- **Header**: 32px rounded-lg icon tile left with light green bg + dark green banknote icon, followed by "Record a payment" semibold
- **Helper text**: muted gray, 8px space above, 12px below
- **Button**: full-width, deep dark green bg (#065f46 / emerald-800), white text, "+" icon left of "Record Payment", centered content, rounded-xl (12px radius), subtle shadow, more compact height

### New Imports/Packages Needed
1. `expo-linear-gradient` - for the gradient accent bar in Card 1 (if not already installed)
2. NativeWind Tailwind classes will be used extensively

### Key Class Changes
- Card: `rounded-2xl` instead of `rounded-[28px]`, `border border-slate-100/50` instead of `border-slate-200`, `shadow-sm` shadow refactored
- Padding: `p-4` instead of `p-4` (stay same but consistent)
- Gap between cards: `gap-3` (12px) instead of `gap-4`
- Status pill: new gradient + dot + wide tracking format
- Balance Due box: new amber theme instead of red
- Line item titles: UPPERCASE enum values (RENT, WATER, GARBAGE, SERVICE_CHARGE)
- Footer balance row: REMOVED
- Tenant avatar: REMOVED
- Payment button: emerald-800 bg, rounded-xl, compact height

### Data/Logic Unchanged
- Invoice data fetching via `useInvoice` hook
- Status theme logic via `getStatusTheme`
- Line item metadata via `getLineItemMeta`
- Payment handler/`RecordManualPaymentDialog` unchanged
- Format functions: `formatKes`, `formatDateLong`, `formatPeriod`
- Navigation/router unchanged

---
*Plan completed. Ready to implement the refactoring.*