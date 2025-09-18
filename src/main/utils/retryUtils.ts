export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  exponentialBackoff?: boolean
  retryableErrors?: string[]
  onRetry?: (error: Error, attempt: number) => void
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    retryableErrors = [],
    onRetry = () => {}
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      lastError = err

      // Check if error is retryable
      const shouldRetry =
        retryableErrors.length === 0 || retryableErrors.some((msg) => err.message.includes(msg))

      // Don't retry if error is explicitly non-retryable
      if (!shouldRetry || attempt === maxRetries) {
        throw err
      }

      // Calculate delay with exponential backoff if enabled
      const currentDelay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs

      // Notify about retry
      onRetry(err, attempt)

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, currentDelay))
    }
  }

  throw lastError || new Error('Retry failed')
}
