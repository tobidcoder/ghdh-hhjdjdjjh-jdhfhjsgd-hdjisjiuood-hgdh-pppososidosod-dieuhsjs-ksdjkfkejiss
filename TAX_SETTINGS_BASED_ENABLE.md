# Tax Input: Settings-Based Enable Implementation

## Overview

Removed the tax checkbox and made the tax input field enabled/disabled directly based on the `enable_tax` setting from localStorage.

## Changes Made

### 1. PaymentSummary Component (`src/renderer/src/components/PaymentSummary.tsx`)

**Removed:**

- Tax checkbox input element
- `onTaxChange` prop and handler

**Updated:**

- Interface now accepts `taxEnabled: boolean` (from settings, not user toggle)
- Tax input field is now:
  - Always visible (no checkbox)
  - Enabled when `taxEnabled === true` (from settings.enable_tax === '1')
  - Disabled (grayed out) when `taxEnabled === false`
  - Default value of 0, fully deletable/editable when enabled

**UI Changes:**

```tsx
// BEFORE: Checkbox + Input
<input type="checkbox" ... />
<label>Tax</label>
<Input type="number" ... />

// AFTER: Label + Input (no checkbox)
<label>Tax</label>
<Input type="number" disabled={!taxEnabled} ... />
```

### 2. Dashboard Component (`src/renderer/src/pages/Dashboard.tsx`)

**Removed:**

- `taxEnabled` state variable
- `setTaxEnabled` state setter
- useEffect that synced settings to taxEnabled state

**Changed:**

- `taxEnabled` is now computed directly from settings:
  ```tsx
  const taxEnabled = settings.enable_tax === '1' || settings.enable_tax === true
  ```
- Removed `onTaxChange` prop from PaymentSummary component call
- Tax logic still uses `taxEnabled` for calculations (now reads from settings)

**Props passed to PaymentSummary:**

```tsx
<PaymentSummary
  cartItems={cartItems}
  onCheckout={handleCheckout}
  taxEnabled={taxEnabled} // From settings, not state
  taxRate={taxRate}
  onTaxRateChange={setTaxRate}
/>
```

## Behavior

### When `enable_tax === '1'` in settings:

- ✅ Tax input is **enabled** (white background, editable)
- ✅ User can type custom percentage (0-100)
- ✅ Default value is 0, fully deletable
- ✅ Tax is calculated: `subtotal × (taxRate / 100)`
- ✅ Tax shows in payment modal and receipt

### When `enable_tax !== '1'` in settings:

- ✅ Tax input is **disabled** (gray background, not editable)
- ✅ Tax rate locked at 0
- ✅ No tax calculated or displayed
- ✅ Input shows "0" but is not interactive

## User Experience

1. **Admin enables tax in settings** → Input becomes editable, user can enter percentage
2. **Admin disables tax in settings** → Input becomes disabled/grayed out
3. **No checkbox needed** → Cleaner UI, single source of truth (settings)
4. **User can clear/edit** → When enabled, can delete 0 and type new value

## Technical Details

- Settings stored in: `localStorage` with key `cheetah_settings`
- Tax enable check: `settings.enable_tax === '1'` (string comparison)
- Tax rate stored as: Number (0-100 percentage)
- Tax amount calculated as: `subtotal × (taxRate / 100)`

## Files Modified

1. `src/renderer/src/components/PaymentSummary.tsx`
2. `src/renderer/src/pages/Dashboard.tsx`

## Testing Checklist

- [ ] With tax enabled in settings, input should be editable
- [ ] With tax disabled in settings, input should be grayed out
- [ ] Default value 0 should be deletable when enabled
- [ ] Custom percentages (e.g., 7.5, 15) should work correctly
- [ ] Payment modal should show tax when applied
- [ ] Receipt should include tax information when applied
- [ ] Changing settings should immediately affect input enable state
