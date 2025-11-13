# Tax Input Box Implementation

## Changes Made

Updated the tax system to use a **text input box** for the tax percentage instead of a fixed rate, allowing users to enter custom tax percentages.

---

## Key Features

### ✅ Tax Percentage Input

- **Text input box** for entering tax percentage (0-100%)
- **Default value:** 0%
- **Editable:** User can type any percentage value
- **Validation:** Only accepts values between 0 and 100
- **Disabled state:** Input is disabled when tax checkbox is unchecked

### ✅ User Flow

1. Check the "Tax" checkbox to enable tax
2. Input box becomes enabled
3. Enter desired tax percentage (e.g., 7.5, 10, 15)
4. Tax amount calculates automatically
5. Grand total updates in real-time

---

## Implementation Details

### 1. **PaymentSummary Component**

**Props Updated:**

```tsx
interface PaymentSummaryProps {
  cartItems: CartItem[]
  onCheckout: () => void
  taxEnabled: boolean
  onTaxChange: (enabled: boolean) => void
  taxRate: number // Now a percentage (0-100)
  onTaxRateChange: (rate: number) => void // NEW
}
```

**UI Layout:**

```tsx
<div className="flex items-center gap-2">
  <input type="checkbox" id="tax-checkbox" checked={taxEnabled} />
  <label>Tax</label>
  <Input
    type="number"
    value={taxRate}
    onChange={(e) => handleTaxRateChange(e.target.value)}
    disabled={!taxEnabled}
    min="0"
    max="100"
    step="0.1"
    className="h-8 text-sm w-20"
  />
  <span>%</span>
  <span>{formatPriceBySymbol(taxAmount)}</span>
</div>
```

**Tax Calculation:**

```tsx
const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0
```

**Input Validation:**

```tsx
const handleTaxRateChange = (value: string) => {
  const numValue = parseFloat(value)
  if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
    onTaxRateChange(numValue)
  } else if (value === '') {
    onTaxRateChange(0)
  }
}
```

### 2. **Dashboard Component**

**State Management:**

```tsx
const [taxEnabled, setTaxEnabled] = useState(() => {
  const savedSettings = JSON.parse(localStorage.getItem('cheetah_settings') || '{}')
  return savedSettings.enable_tax === '1' || savedSettings.enable_tax === true
})
const [taxRate, setTaxRate] = useState(0) // Default 0%
```

**Tax Calculations:**

```tsx
// In handlePaymentSubmit
const taxAmount = taxEnabled ? subtotal * (taxRate / 100) : 0
const totalAmount = subtotal + taxAmount

// In sale data
tax_rate: taxEnabled ? taxRate / 100 : 0 // Store as decimal
```

**Props Passed:**

```tsx
<PaymentSummary
  cartItems={cartItems}
  onCheckout={handleCheckout}
  taxEnabled={taxEnabled}
  onTaxChange={setTaxEnabled}
  taxRate={taxRate} // Pass as percentage
  onTaxRateChange={setTaxRate} // Pass setter
/>
```

---

## Visual Design

### Layout Structure:

```
┌──────────────────────────────────────────┐
│  Subtotal:               ₦10,000.00      │
├──────────────────────────────────────────┤
│  ☑ Tax  [  7.5  ] %      ₦750.00        │
│  └── checkbox  └── input   └── amount   │
├──────────────────────────────────────────┤
│  Grand Total:             ₦10,750.00     │
└──────────────────────────────────────────┘
```

### States:

**Tax Disabled (default):**

```
☐ Tax  [  0  ] %  (grayed out)    ₦0.00 (gray)
      └── input is disabled
```

**Tax Enabled:**

```
☑ Tax  [  7.5  ] %                ₦750.00 (orange)
      └── input is enabled
```

---

## Example Usage Scenarios

### Scenario 1: Default State

```
Cart Subtotal: ₦10,000.00
Tax: ☐ Unchecked, Input = 0%
Tax Amount: ₦0.00
Grand Total: ₦10,000.00
```

### Scenario 2: Enable Tax with 7.5%

```
User checks "Tax" checkbox
User enters "7.5" in the input box

Cart Subtotal: ₦10,000.00
Tax: ☑ Checked, Input = 7.5%
Tax Amount: ₦750.00
Grand Total: ₦10,750.00
```

### Scenario 3: Change Tax to 10%

```
User changes input from "7.5" to "10"

Cart Subtotal: ₦10,000.00
Tax: ☑ Checked, Input = 10%
Tax Amount: ₦1,000.00
Grand Total: ₦11,000.00
```

### Scenario 4: Custom Tax 15.5%

```
User enters "15.5" in the input box

Cart Subtotal: ₦10,000.00
Tax: ☑ Checked, Input = 15.5%
Tax Amount: ₦1,550.00
Grand Total: ₦11,550.00
```

---

## Input Validation

### Accepted Values:

- ✅ Integers: 0, 1, 5, 10, 15, etc.
- ✅ Decimals: 7.5, 10.5, 12.75, etc.
- ✅ Range: 0 to 100 (inclusive)

### Rejected Values:

- ❌ Negative numbers: -5
- ❌ Greater than 100: 105, 150
- ❌ Non-numeric: "abc", "ten"

### Edge Cases:

- Empty input → Defaults to 0
- Input "0" → Valid, no tax applied
- Input "100" → Valid, 100% tax (doubles the price)

---

## Database Storage

Tax values are stored as **decimals** in the database:

```typescript
// User inputs: 7.5%
taxRate = 7.5 // In state (percentage)

// Saved to database
tax_rate: 7.5 / 100 // = 0.075 (decimal)
tax_amount: subtotal * 0.075 // Actual amount

// Receipt generation
taxRate: 7.5 / 100 // Pass as decimal for display
```

---

## Changes from Previous Implementation

### Before:

```tsx
// Fixed tax rate
const TAX_RATE = 0.075 // 7.5% hardcoded

// Checkbox only
<input type="checkbox" />
<label>Apply Tax (7.5%)</label>

// User couldn't change rate
```

### After:

```tsx
// Dynamic tax rate
const [taxRate, setTaxRate] = useState(0) // User input

// Checkbox + Input
<input type="checkbox" />
<label>Tax</label>
<Input type="number" value={taxRate} onChange={...} />
<span>%</span>

// User can change rate
```

---

## Files Modified

1. **PaymentSummary.tsx**
   - Added `taxRate` prop (as percentage)
   - Added `onTaxRateChange` prop
   - Added Input component for tax percentage
   - Updated layout to show checkbox + input + percentage sign
   - Input is disabled when checkbox is unchecked

2. **Dashboard.tsx**
   - Changed `TAX_RATE` constant to `taxRate` state
   - Default value: 0
   - Added `setTaxRate` state setter
   - Updated all calculations to use `taxRate / 100`
   - Passed `taxRate` and `setTaxRate` to PaymentSummary

3. **PaymentModal.tsx**
   - Already updated (receives taxRate as decimal)
   - Displays as percentage in modal

---

## Testing

### Test Checklist:

- [x] Input defaults to 0
- [x] Input is disabled when tax checkbox is unchecked
- [x] Input becomes enabled when checkbox is checked
- [x] Can enter whole numbers (1, 5, 10)
- [x] Can enter decimals (7.5, 12.75)
- [x] Values between 0-100 are accepted
- [x] Negative values are rejected
- [x] Values > 100 are rejected
- [x] Tax amount calculates correctly
- [x] Grand total updates in real-time
- [x] Payment Modal shows correct tax
- [x] Receipt prints correct tax
- [x] Database stores tax_rate as decimal

---

## Benefits

✅ **Flexibility:** Users can enter any tax percentage
✅ **Simplicity:** Default is 0% (no tax)
✅ **Clarity:** Input box shows exact percentage
✅ **Control:** Enable/disable with checkbox
✅ **Real-time:** Instant calculation updates
✅ **Validation:** Prevents invalid inputs
✅ **Consistency:** Same rate flows through all components

---

## Summary

The tax system now uses a **text input box** for entering custom tax percentages:

- Default: **0%** (no tax)
- Editable: User can enter **any percentage from 0 to 100**
- Disabled when checkbox is unchecked
- Real-time calculation and updates
- Consistent across Payment Summary, Payment Modal, and Receipt

This provides maximum flexibility while maintaining a simple, user-friendly interface! 🎉
