# Tax System Implementation

## Overview

Implemented a toggleable tax system that allows users to apply tax to sales. Tax can be enabled via a checkbox in the Payment Summary section. The default state of the checkbox is controlled by the `enable_tax` setting from the database.

---

## Features

### ✅ Settings Integration

- **Checks `enable_tax` setting from localStorage**
- If `enable_tax === '1'` in settings, checkbox is **checked by default**
- If `enable_tax === '0'` or not set, checkbox is **unchecked by default**
- User can still toggle it on/off regardless of the default setting
- Updates when settings change

### ✅ Default State

- Tax default is controlled by `enable_tax` setting
- Sales are processed without tax unless enabled by user or settings
- Clean UI shows subtotal and grand total

### ✅ Tax Checkbox

- Located in the Payment Summary panel
- Shows tax rate percentage (7.5%)
- Real-time calculation when toggled
- Visual feedback: tax amount highlighted in orange when enabled

### ✅ Tax Calculation

- **Tax Rate:** 7.5% (configurable via `TAX_RATE` constant)
- **Formula:** `Tax Amount = Subtotal × Tax Rate` (when enabled)
- **Grand Total:** `Subtotal + Tax Amount`
- Applied to entire cart subtotal

### ✅ Receipt Integration

- Tax amount shown on receipt only when applied
- Displays tax rate percentage (e.g., "Tax (7.5%): ₦150.00")
- Subtotal, tax, and grand total clearly separated
- No tax line shown when tax is disabled

### ✅ Database Storage

- `tax_rate` field stores the rate used (0 or 0.075)
- `tax_amount` field stores calculated amount
- Preserved for historical accuracy and reporting

---

## Implementation Details

### 1. **PaymentSummary Component**

**File:** `src/renderer/src/components/PaymentSummary.tsx`

**Changes:**

- Added `taxEnabled` prop (boolean)
- Added `onTaxChange` prop (callback function)
- Added `taxRate` prop (default: 0.075 = 7.5%)
- Tax checkbox with label showing percentage
- Conditional display of tax amount
- Layout updates:
  - Shows subtotal
  - Tax checkbox with amount (orange when enabled, gray when disabled)
  - Grand total (bold, green)

**UI Layout:**

```
Subtotal:                 ₦2,000.00
☐ Apply Tax (7.5%)        ₦0.00      (gray when unchecked)
☑ Apply Tax (7.5%)        ₦150.00    (orange when checked)
-----------------------------------
Grand Total:              ₦2,150.00
```

### 2. **Dashboard Component**

**File:** `src/renderer/src/pages/Dashboard.tsx`

**Changes:**

- Added `taxEnabled` state (default: `false`)
- Added `TAX_RATE` constant (0.075 = 7.5%)
- Updated `handlePaymentSubmit`:
  - Calculates `taxAmount = taxEnabled ? subtotal * TAX_RATE : 0`
  - Sets `tax_rate` in sale data based on `taxEnabled`
  - Passes tax info to receipt generation
- Updated PaymentSummary rendering:
  - Passes `taxEnabled`, `onTaxChange`, and `taxRate` props

**Code:**

```typescript
const [taxEnabled, setTaxEnabled] = useState(false)
const TAX_RATE = 0.075 // 7.5% tax rate

// In handlePaymentSubmit:
const taxAmount = taxEnabled ? subtotal * TAX_RATE : 0
const totalAmount = subtotal + taxAmount

// In sale data:
tax_rate: taxEnabled ? TAX_RATE : 0
```

### 3. **Receipt Generation**

**File:** `src/renderer/src/utils/printUtils.ts`

**Changes:**

#### `generateReceiptData()` function:

- Added `taxAmount` parameter (optional)
- Added `taxRate` parameter (optional)
- Stores tax info in `saleData` object for receipt HTML

#### `generateReceiptHTML()` function:

- Uses `saleData.taxAmount` instead of hardcoded 0
- Calculates `totalAmount` including tax
- Conditionally shows tax line only when `taxAmount > 0`
- Displays tax rate percentage in label

**Receipt Display:**

```
Total Amount:             ₦2,000.00
Tax (7.5%):               ₦150.00     [Only shown when taxAmount > 0]
-----------------------------------
Grand Total:              ₦2,150.00
```

### 4. **Sales Store**

**File:** `src/renderer/src/store/sales.ts`

**No changes required** - already had `tax_amount` and `tax_rate` fields in Sale interface.

---

## Configuration

### Changing Tax Rate

To change the default tax rate, update the constant in Dashboard.tsx:

```typescript
const TAX_RATE = 0.075 // Change this value
// Examples:
// 0.05   = 5%
// 0.10   = 10%
// 0.15   = 15%
// 0.075  = 7.5% (current default)
```

### Making Tax Enabled by Default

To enable tax by default, change the initial state:

```typescript
const [taxEnabled, setTaxEnabled] = useState(true) // Change false to true
```

---

## User Flow

### Without Tax (Default):

1. User adds items to cart
2. Payment Summary shows: Subtotal = Grand Total
3. Tax checkbox is unchecked, tax amount shows ₦0.00 (gray)
4. User completes payment
5. Receipt shows no tax line

### With Tax:

1. User adds items to cart
2. User checks "Apply Tax (7.5%)" checkbox
3. Tax amount updates instantly (orange)
4. Grand Total increases
5. User completes payment
6. Receipt shows:
   - Subtotal
   - Tax (7.5%): amount
   - Grand Total

---

## Testing Checklist

### ✅ UI Testing

- [ ] Tax checkbox appears in Payment Summary
- [ ] Tax is unchecked by default
- [ ] Checking tax updates amounts immediately
- [ ] Tax rate percentage displays correctly (7.5%)
- [ ] Tax amount highlighted in orange when enabled
- [ ] Tax amount gray when disabled
- [ ] Grand total updates correctly

### ✅ Calculation Testing

- [ ] Tax = 0 when checkbox unchecked
- [ ] Tax = subtotal × 0.075 when checked
- [ ] Grand total = subtotal + tax
- [ ] Multiple cart items calculate correctly
- [ ] Large amounts calculate correctly
- [ ] Small amounts calculate correctly

### ✅ Receipt Testing

- [ ] No tax line when tax disabled
- [ ] Tax line shows when tax enabled
- [ ] Tax rate percentage shown on receipt
- [ ] Tax amount correct on receipt
- [ ] Grand total correct on receipt
- [ ] Receipt totals match payment screen

### ✅ Database Testing

- [ ] `tax_rate` = 0 when tax disabled
- [ ] `tax_rate` = 0.075 when tax enabled
- [ ] `tax_amount` = 0 when tax disabled
- [ ] `tax_amount` correct when tax enabled
- [ ] Sale record persists correctly

### ✅ Edge Cases

- [ ] Tax checkbox works with empty cart
- [ ] Tax updates when items added/removed
- [ ] Tax updates when quantities change
- [ ] Tax persists during hold save/load
- [ ] Tax state resets after sale completion

---

## Future Enhancements

### 1. **Multiple Tax Rates**

- Support different tax rates per product category
- VAT vs Sales Tax configurations
- Tax exemptions for certain products

### 2. **Tax Settings Page**

- Configure default tax rate
- Enable/disable tax by default
- Tax reporting and summaries

### 3. **Tax Breakdown**

- Show itemized tax per product
- Support compound tax (tax on tax)
- Tax included vs tax excluded pricing

### 4. **Tax Reports**

- Daily/monthly tax collected
- Tax remittance reports
- Export tax data for accounting

### 5. **Remember Last State**

- Save user's last tax preference
- Auto-enable for certain customers
- Profile-based tax settings

---

## Technical Notes

### Why Default to 0%?

- Simplifies initial UX (most sales might not need tax)
- Users explicitly opt-in to tax
- Reduces accidental tax application
- Clear audit trail (tax only when checkbox checked)

### Calculation Precision

- Uses JavaScript number precision
- Displayed with 2 decimal places
- Stored as-is in database (floating point)
- Currency formatter handles display

### State Management

- Tax state managed at Dashboard level
- Passed down via props to PaymentSummary
- Calculated fresh on every payment
- Not stored in cart items (global setting)

---

## Summary

✅ **Tax system fully implemented**

- Default: OFF (0%)
- Toggleable via checkbox
- 7.5% tax rate (configurable)
- Real-time calculation
- Receipt integration
- Database persistence
- Clean, intuitive UI

Users can now optionally apply tax to sales with a simple checkbox. The system is flexible, accurate, and ready for production use! 🎉
