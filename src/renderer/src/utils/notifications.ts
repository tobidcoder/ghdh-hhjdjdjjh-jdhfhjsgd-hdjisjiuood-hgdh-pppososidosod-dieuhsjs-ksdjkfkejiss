import Swal from 'sweetalert2'

/**
 * Show a success notification
 */
export const showSuccess = (message: string, title: string = 'Success') => {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  })
}

/**
 * Show an error notification
 */
export const showError = (message: string, title: string = 'Error') => {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true
  })
}

/**
 * Show a warning notification
 */
export const showWarning = (message: string, title: string = 'Warning') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true
  })
}

/**
 * Show an info notification
 */
export const showInfo = (message: string, title: string = 'Info') => {
  return Swal.fire({
    icon: 'info',
    title,
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  })
}

/**
 * Show a confirmation dialog
 */
export const showConfirmation = (
  message: string,
  title: string = 'Are you sure?',
  confirmButtonText: string = 'Yes',
  cancelButtonText: string = 'No'
) => {
  return Swal.fire({
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: '#b2d93b',
    cancelButtonColor: '#d33',
    confirmButtonText,
    cancelButtonText
  })
}

/**
 * Show a loading notification
 */
export const showLoading = (message: string = 'Please wait...', title: string = 'Processing') => {
  Swal.fire({
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

/**
 * Close any open SweetAlert dialog
 */
export const closeNotification = () => {
  Swal.close()
}

/**
 * Show a modal with custom content
 */
export const showModal = (title: string, html: string, showConfirmButton: boolean = true) => {
  return Swal.fire({
    title,
    html,
    showConfirmButton,
    confirmButtonColor: '#b2d93b'
  })
}

/**
 * Parse and show API error response
 */
export const showApiError = (error: any) => {
  let message = 'An unexpected error occurred'

  // Try to extract message from various error formats
  if (error?.response?.data?.message) {
    message = error.response.data.message
  } else if (error?.message) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  }

  return showError(message, 'Operation Failed')
}

/**
 * Show printer error notification
 */
export const showPrinterError = (error: any) => {
  let message = 'Failed to print receipt'
  let title = 'Printer Error'

  if (typeof error === 'string') {
    if (error.includes('NO_PRINTER_CONNECTED')) {
      title = 'No Printer Connected'
      message = 'Please connect a printer and try again.'
    } else {
      message = error
    }
  } else if (error?.message) {
    message = error.message
  }

  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: '#b2d93b',
    confirmButtonText: 'OK'
  })
}
