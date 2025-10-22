import JsBarcode from 'jsbarcode'
// import { useSettingsStore } from '../store/settings'

export const printReceipt = async (receiptData: any): Promise<void> => {
  console.log('[PRINT] Starting printReceipt function with data:', receiptData)
  try {
    // Fetch payment method display name if paymentMethod is an ID
    let paymentMethodDisplayName = receiptData.saleData.paymentMethod

    if (typeof receiptData.saleData.paymentMethod === 'number' ||
        (typeof receiptData.saleData.paymentMethod === 'string' && !isNaN(Number(receiptData.saleData.paymentMethod)))) {
      try {
        const paymentMethod = await window.api.db.getPaymentMethodById(Number(receiptData.saleData.paymentMethod))
        if (paymentMethod && paymentMethod.display_name) {
          paymentMethodDisplayName = paymentMethod.display_name
        }
      } catch (error) {
        console.error('[PRINT] Failed to fetch payment method display name:', error)
        // Keep the original value as fallback
      }
    }

    // Update receiptData with the display name
    const updatedReceiptData = {
      ...receiptData,
      saleData: {
        ...receiptData.saleData,
        paymentMethod: paymentMethodDisplayName
      }
    }

    // Generate receipt HTML content
    const receiptHTML = generateReceiptHTML(updatedReceiptData)
    console.log('[PRINT] Generated receipt HTML:', receiptHTML.substring(0, 200) + '...')

    // Create the complete HTML document for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: white;
              }
              .receipt {
                width: 80mm;
                margin: 0 auto;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.2;
                background: white;
                color: black;
              }
              .no-print { display: none; }
            }

            body {
              font-family: monospace;
              font-size: 12px;
              line-height: 1.2;
              margin: 0;
              padding: 10px;
              background: white;
              color: black;
            }

            .receipt {
              width: 80mm;
              margin: 0 auto;
              background: white;
            }

            .receipt-header {
              text-align: center;
              margin-bottom: 15px;
            }

            .receipt-header h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }

            .receipt-header p {
              margin: 2px 0;
              font-size: 10px;
            }

            .receipt-divider {
              border-top: 1px solid #ccc;
              margin: 10px 0;
            }

            .items-table {
              margin-bottom: 15px;
            }

            .items-header {
              display: grid;
              grid-template-columns: 7fr 1fr 4fr 4fr;
              gap: 5px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 5px;
              font-size: 10px;
            }

            .item-row {
              display: grid;
              grid-template-columns: 7fr 1fr 4fr 4fr;
              gap: 5px;
              padding: 3px 0;
              border-bottom: 1px solid #eee;
              font-size: 10px;
            }

            .item-name {
              word-wrap: break-word;
            }

            .text-center { text-align: center; }
            .text-right { text-align: right; }

            .summary {
              border-top: 1px solid #ccc;
              padding-top: 10px;
              margin-bottom: 15px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 11px;
            }

            .grand-total {
              border-top: 1px solid #ccc;
              padding-top: 8px;
              font-weight: bold;
              font-size: 14px;
            }

            .receipt-footer {
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }

            .note-section {
              text-align: left;
              margin-bottom: 10px;
              padding: 5px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }

            .note-label {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 3px;
            }

            .note-content {
              font-size: 9px;
              margin: 0;
              word-wrap: break-word;
            }

            .barcode {
              width: 100%;
              height: 40px;
              background: #f0f0f0;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 10px 0;
              font-size: 8px;
              color: #666;
            }

            .barcode-text {
              font-size: 8px;
              margin-top: 5px;
            }

            .powered-by {
              font-size: 8px;
              color: #999;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
        </body>
      </html>
    `

    // Silent print without opening a visible window
    const printRes = await window.api.print.receipt(htmlContent, { silent: true })
    if (!printRes.success) {
      throw new Error(printRes.error || 'Unknown print error')
    }
  } catch (error) {
    console.error('Error printing receipt:', error)
    throw error
  }
}

// Convenience: build receipt data directly from a sale record and print
export const printReceiptFromSale = async (sale: any): Promise<void> => {
  try {
    const settings = JSON.parse(localStorage.getItem('cheetah_settings') || '{}')
    const user = JSON.parse(localStorage.getItem('cheetah_auth_user') || 'null')

    // Parse cart items from sale.sale_items (double-encoded) or fallback to sale.items
    let cartItems: any[] = []
    try {
      if (sale?.sale_items) {
        cartItems = JSON.parse(JSON.parse(sale.sale_items))
      } else if (sale?.items) {
        cartItems = JSON.parse(sale.items)
      }
    } catch {
      cartItems = []
    }

    // Normalize each item to { name, price, quantity }
    const normalizedItems = cartItems.map((it: any) => ({
      name: it.name ?? it.product_name ?? it.title ?? 'Item',
      price: Number(it.price ?? it.selling_price ?? it.unit_price ?? 0),
      quantity: Number(it.quantity ?? it.qty ?? 1)
    }))

    const invoiceNumber = sale?.invoice_number ?? sale?.ref ?? ''
    const receiptData = {
      saleData: {
        invoiceNumber,
        date: sale?.date || sale?.created_at || new Date().toISOString(),
        customerName: sale?.customer_name || null,
        paymentMethod: sale?.payment_method,
        paymentStatus: sale?.payment_status,
        note: sale?.note || null,
        receivedAmount: sale?.received_amount ?? sale?.grand_total ?? sale?.total_amount ?? 0,
        changeReturn: sale?.change_return ?? 0,
        ref: sale?.ref || invoiceNumber
      },
      cartItems: normalizedItems,
      companyInfo: {
        name: settings?.company_name || '',
        address: settings?.address || '',
        phone: settings?.phone || '',
        email: settings?.email || '',
        branch: settings?.warehouse_name || '',
        cashier: user?.name || user?.username || 'Cashier'
      },
      totals: {
        subtotal: normalizedItems.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0),
        taxAmount: 0,
        totalAmount: normalizedItems.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0)
      }
    }

    await printReceipt(receiptData)
  } catch (error) {
    console.error('[PRINT] Failed to build receipt from sale:', error)
    throw error
  }
}

const generateReceiptHTML = (receiptData: any): string => {
  const { saleData, cartItems, companyInfo } = receiptData
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
  const taxAmount = 0
  // const taxAmount = subtotal * 0.15
  const totalAmount = subtotal + taxAmount
  
  // Calculate totals for display
  const totalItems = cartItems.length
  const totalQuantity = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
  const settings = JSON.parse(localStorage.getItem('cheetah_settings') || '{}')
  const showBarcode = settings.show_barcode_in_receipt == "1"
  // const showLogo = settings.show_logo_in_receipt == "1"
  const showPhone = settings.show_phone == "1"
  const showAddress = settings.show_address == "1"
  const showCustomer = settings.show_customer == "1"
  const showEmail = settings.show_email == "1"
  const showNote = settings.show_note == "1"
  // const showTaxDiscountShipping = settings.show_tax_discount_shipping == "1"
  const taxEnabled = settings.enable_tax =="1"
  const discountEnabled = settings.enable_discount =="1"
  const shippingEnabled = settings.enable_shipping =="1"


  // Get settings for field visibility
  // const {
  //   getShowPhone,
  //   getShowAddress,
  //   getShowCustomer,
  //   getShowEmail,
  //   // getShowBarcodeInReceipt,
  //   // getShowLogoInReceipt,
  //   getShowNote,
  //   // getShowTaxDiscountShipping,
  //   getTaxEnabled,
  //   getDiscountEnabled,
  //   getShippingEnabled
  // } = useSettingsStore.getState()

  // const showPhone = getShowPhone()
  // const showAddress = getShowAddress()
  // const showCustomer = getShowCustomer()
  // const showEmail = getShowEmail()


  // const showBarcodeInReceipt = getShowBarcodeInReceipt()
  // const showLogoInReceipt = getShowLogoInReceipt()
  // const showNote = getShowNote()
  // const showTaxDiscountShipping = getShowTaxDiscountShipping()
  // const taxEnabled = getTaxEnabled()
  // const discountEnabled = getDiscountEnabled()
  // const shippingEnabled = getShippingEnabled()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Generate barcode SVG
  const generateBarcodeSVG = (value: string): string => {
    try {
      // Create a temporary canvas element
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, value, {
        format: 'CODE128',
        width: 1.5,
        height: 50,
        displayValue: false,
        background: '#ffffff',
        lineColor: '#000000'
      })

      // Convert canvas to SVG (simplified approach)
      const svg = `<svg width="100%" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <image href="${canvas.toDataURL()}" width="100%" height="50"/>
      </svg>`
      return svg
    } catch (error) {
      console.error('Error generating barcode:', error)
      return `<div style="width: 150px; height: 40px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 8px;">[BARCODE ERROR]</div>`
    }
  }

  // Get payment method display name (no longer needed as we handle it in printReceipt)
  const getPaymentMethodDisplayName = (paymentMethodId: string | number): string => {
    // This function is now just a fallback for the HTML template
    // The actual lookup is done in printReceipt function
    return String(paymentMethodId)
  }

  return `
    <div class="receipt">
      <!-- Company Header -->
      <div class="receipt-header">
        <h1>${companyInfo.name}</h1>
        <p>${formatDate(saleData.date)}</p>
        <p>Branch: ${companyInfo.branch}</p>
        ${showAddress ? `<p>${companyInfo.address}</p>` : ''}
        <p>Cashier: ${companyInfo.cashier}</p>
        ${showPhone ? `<p>Phone: ${companyInfo.phone}</p>` : ''}
        ${showEmail ? `<p>Email: ${companyInfo.email}</p>` : ''}
        ${showCustomer ? `<p>Customer: ${saleData.customerName || 'walk-in-customer'}</p>` : ''}
      </div>

      <!-- Divider -->
      <div class="receipt-divider"></div>

      <!-- Items Table -->
      <div class="items-table">
        <div class="items-header">
          <div>Item</div>
          <div class="text-center">Qty</div>
          <div class="text-right">Price</div>
          <div class="text-right">Total</div>
        </div>

        ${cartItems
          .map(
            (item: any) => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="text-center">${item.quantity}</div>
            <div class="text-right">${formatPrice(item.price)}</div>
            <div class="text-right">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `
          )
          .join('')}
          <div class="summary-row">
            <div class="summary-row">
              <span>Total Items: </span>
              <span>${totalItems}</span>
            </div>
            <div class="summary-row">
              <span>Total Quantity: </span>
              <span>${totalQuantity}</span>
            </div>
          </div>
      </div>

      <!-- Summary Section -->
      <div class="summary">
       
        <div class="summary-row">
          <span>Total Amount:</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        ${
          taxEnabled
            ? `
        <div class="summary-row">
          <span>Tax:</span>
          <span>${formatPrice(taxAmount)}</span>
        </div>
        `
            : ''
        }
        ${
          discountEnabled
            ? `
        <div class="summary-row">
          <span>Discount:</span>
          <span>${formatPrice(0)}</span>
        </div>
        `
            : ''
        }
        ${
          shippingEnabled
            ? `
        <div class="summary-row">
          <span>Shipping:</span>
          <span>${formatPrice(0)}</span>
        </div>
        `
            : ''
        }

        <div class="summary-row">
          <span>Payment Method:</span>
          <span>${getPaymentMethodDisplayName(saleData.paymentMethod)}</span>
        </div>
        <div class="summary-row">
          <span>Change:</span>
          <span>${formatPrice(saleData.changeReturn)}</span>
        </div>
        <div class="grand-total">
          <div class="summary-row">
            <span>Grand Total:</span>
            <span>${formatPrice(totalAmount)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="receipt-footer">
        ${
          showNote && saleData.note
            ? `
        <div class="note-section">
          <p class="note-label">Note:</p>
          <p class="note-content">${saleData.note}</p>
        </div>
        `
            : ''
        }
        ${
          showBarcode
            ? `
        <div class="barcode">
          ${generateBarcodeSVG(saleData.ref || saleData.invoiceNumber)}
        </div>
        `
        : ''
      }
      <p class="barcode-text">${saleData.ref || saleData.invoiceNumber}</p>
        <p class="powered-by">Powered by: www.usecheetah.com</p>
      </div>
    </div>
  `
}

export const generateReceiptData = (
  invoiceNumber: string,
  cartItems: any[],
  paymentData: any,
  companyInfo: any,
  saleRef?: string
) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * 0.15
  const totalAmount = subtotal + taxAmount

  return {
    saleData: {
      invoiceNumber,
      date: new Date().toISOString(),
      customerName: null,
      paymentMethod: paymentData.paymentType,
      paymentStatus: paymentData.paymentStatus,
      note: paymentData.note,
      receivedAmount: paymentData.receivedAmount,
      changeReturn: paymentData.changeReturn,
      ref: saleRef || invoiceNumber // Add ref field for barcode
    },
    cartItems,
    companyInfo: {
      name: companyInfo?.company_name || '',
      address: companyInfo?.address || '',
      phone: companyInfo?.phone || '',
      email: companyInfo?.email || '',
      branch: companyInfo?.warehouse_name||"",
      cashier: 'Rapheal'
    },
    totals: {
      subtotal,
      taxAmount,
      totalAmount
    }
  }
}
