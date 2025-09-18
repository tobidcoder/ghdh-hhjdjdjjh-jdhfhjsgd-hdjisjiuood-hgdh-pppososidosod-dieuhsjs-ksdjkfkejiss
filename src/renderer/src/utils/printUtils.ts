export const printReceipt = async (receiptData: any): Promise<void> => {
  console.log('[PRINT] Starting printReceipt function with data:', receiptData)
  try {
    // Generate receipt HTML content
    const receiptHTML = generateReceiptHTML(receiptData)
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
              grid-template-columns: 3fr 1fr 1fr 1fr;
              gap: 5px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
              margin-bottom: 5px;
              font-size: 10px;
            }

            .item-row {
              display: grid;
              grid-template-columns: 3fr 1fr 1fr 1fr;
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

    // In-app preview + one-click Print
    console.log('[PRINT] Opening in-app preview...')
    const open = await window.api.print.openPreview(htmlContent)
    if (!open.success) {
      throw new Error('Failed to open preview window')
    }
    console.log('[PRINT] Preview opened. Triggering print...')
    const printRes = await window.api.print.current({ silent: true })
    console.log('[PRINT] Print current preview result:', printRes)
    if (!printRes.success) {
      throw new Error(printRes.error || 'Unknown print error')
    }
  } catch (error) {
    console.error('Error printing receipt:', error)
    alert('Error printing receipt: ' + (error as Error).message)
  }
}

const generateReceiptHTML = (receiptData: any): string => {
  const { saleData, cartItems, companyInfo } = receiptData
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * 0.15
  const totalAmount = subtotal + taxAmount

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
    return `₦ ${price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return `
    <div class="receipt">
      <!-- Company Header -->
      <div class="receipt-header">
        <h1>${companyInfo.name}</h1>
        <p>${formatDate(saleData.date)}</p>
        <p>Branch: ${companyInfo.branch}</p>
        <p>Cashier: ${companyInfo.cashier}</p>
        <p>${companyInfo.address}</p>
        <p>Phone: ${companyInfo.phone}</p>
        <p>${companyInfo.email}</p>
        <p>Customer: ${saleData.customerName || 'walk-in-customer'}</p>
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

        ${cartItems.map((item: any) => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="text-center">${item.quantity}</div>
            <div class="text-right">${formatPrice(item.price)}</div>
            <div class="text-right">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Summary Section -->
      <div class="summary">
        <div class="summary-row">
          <span>Total Amount:</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Order Tax:</span>
          <span>${formatPrice(taxAmount)} (15.00%)</span>
        </div>
        <div class="summary-row">
          <span>Discount:</span>
          <span>${formatPrice(0)}</span>
        </div>
        <div class="summary-row">
          <span>Shipping:</span>
          <span>${formatPrice(0)}</span>
        </div>
        <div class="summary-row">
          <span>Payment Method:</span>
          <span>${saleData.paymentMethod}</span>
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
        <div class="barcode">
          [BARCODE]
        </div>
        <p class="barcode-text">${saleData.invoiceNumber}</p>
        <p class="powered-by">Powered by: www.usecheetah.com</p>
      </div>
    </div>
  `
}

export const generateReceiptData = (
  invoiceNumber: string,
  cartItems: any[],
  paymentData: any,
  companyInfo: any
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
      changeReturn: paymentData.changeReturn
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
