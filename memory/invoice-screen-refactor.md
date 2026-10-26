---
name: invoice-screen-refactor
description: Summary of Invoice Details screen refactoring changes
metadata:
  type: project
---

## Invoice Details Screen Refactoring - Completed

### File Modified
`client/src/app/(owner)/invoice/\[id\].tsx`

### Key Changes Applied

#### 1. New Import
- `LinearGradient` from `expo-linear-gradient` (already installed, v57.0.2)

#### 2. Visual Styling Overhaul

**Overall Page**
- Background: `#f8faf9` → `bg-slate-50` (very light gray, almost white)
- Content container: Added `gap-3` for card spacing
- Header border: `border-b border-slate-200` → `border-b border-slate-100/50`

**Card 1: General Information**
- Card corners: `rounded-[28px]` → `rounded-2xl` (16px, more compact)
- Card border: `border-slate-200` → `border-slate-100/50` (hairline light-gray)
- Shadow: simplified to `shadow-sm` (removed shadow-slate-200/60)
- **Accent bar**: Added `LinearGradient` with colors `#f87171` → `#fca5a5` (red/rose to pink/orange), 6px tall, absolute-positioned at top, clipped by rounded corners via `overflow-hidden`
- Removed: old `theme.accent` solid bar

**Card 2: Line Items**
- Card corners: `rounded-[28px]` → `rounded-2xl`
- Card border: `border-slate-200` → `border-slate-100/50`
- Header: "Line Items" text size `text-[16px]` → `text-sm font-semibold`
- Badge: replaced `View rounded-full bg-slate-100` with `Badge rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600`
- Row layout: gap `py-3` → `py-2`, gap-3 → gap-2.5
- **Icon tiles**: 32px → rounded-lg `h-8 w-8` with 16px icons
- **Labels**: `text-[14px] font-semibold text-slate-900` → `text-xs font-semibold uppercase tracking-[0.1em]` (UPPERCASE enum values: RENT, WATER, GARBAGE, SERVICE_CHARGE)
- **Descriptions**: `text-[12px] text-slate-500` → `text-xs text-slate-500`
- **Amounts**: `text-[14px] font-bold text-slate-900` → `text-sm font-bold text-slate-900` with `textAlign: 'right'`
- **Separators**: `bg-slate-100` → `h-0.5 bg-slate-100/50` (very faint hairline)
- **Footer**: Removed second "BALANCE DUE" row; kept only "TOTAL DUE" + amount

**Card 3: Tenant Information**
- Card corners: `rounded-[28px]` → `rounded-2xl`
- Card border: `border-slate-200` → `border-slate-100/50`
- Title: `text-[16px] font-bold` → `text-sm font-semibold`
- **Circular avatar with "T" REMOVED** - showing only text rows
- Two rows: label left `text-xs text-slate-500`, value right `text-sm font-semibold text-slate-900`
- Divider: `bg-slate-200` → `bg-slate-100/50`
- Padding: `gap-3` → `gap-1.5` (tighter)

**Card 4: Record a Payment**
- Removed: `PaymentCard` component (Card with p-4, mb-3, large button)
- Added: `PaymentButton` component using `Button` UI component
- Button: `w-full rounded-xl bg-emerald-800 shadow-sm shadow-emerald-800/15 py-2.5 text-white flex items-center justify-center gap-2`
- Icon: `Plus` size 18 → 16
- Text: "Record Payment" (no size change, uses button's text variant)
- Height: more compact (py-2.5 vs previous h-[48px] card)
- Helper text: removed (was in PaymentCard, now inline or omitted per design)

#### 3. New Components Created

**BalanceDueBox** (replaced BalanceHighlight)
- Full-width box: `rounded-xl border border-amber-200 bg-amber-50 p-3`
- Left: 32px rounded-lg `h-8 w-8 bg-amber-100` with Wallet icon
- Right: label "BALANCE DUE" `text-xs font-medium uppercase tracking-[0.15em] text-amber-700`, value "KES 27,650" `text-sm font-bold text-slate-900`
- **Key**: dark near-black value (NOT red like old version)

**PaymentButton** (replaced PaymentCard)
- Uses `Button` component from `@/components/ui/button`
- Deep green: `bg-emerald-800` (#065f46)
- Compact: `rounded-xl py-2.5`
- Content: Plus icon + "Record Payment" text, centered

#### 4. Logic Preserved (UNCHANGED Per Rules)
- `useInvoice` hook for data fetching
- `getStatusTheme`, `getDerivedInvoiceStatus`, `normalizeInvoiceStatus` logic
- `getLineItemMeta` for line item metadata
- `formatKES`, `formatDateLong`, `formatPeriod` format functions
- `RecordManualPaymentDialog` handler
- `useLocalSearchParams` / `router.back` navigation
- Invoice status derivation (OVERDUE/PARTIAL/PAID/UNPAID)
- Line item data mapping

#### 5. No Font Size Hardcoding
- All text sizes use Tailwind default size classes (`text-xs`, `text-sm`, etc.)
- No hardcoded `font-[10px]`, `font-[15px]`, etc.
- Where sizes were mentioned in the brief (color, weight, alignment), default sizes are kept

#### 6. lucide-react-native Icons Used
- Receipt, Calendar, Home, Wallet, Banknote, Plus
- Droplet, Trash2, Wrench (for line item icons)
- ArrowLeft (back button)

#### Output
Full updated screen component returned with all visual styling and markup changes applied per the target design specification.