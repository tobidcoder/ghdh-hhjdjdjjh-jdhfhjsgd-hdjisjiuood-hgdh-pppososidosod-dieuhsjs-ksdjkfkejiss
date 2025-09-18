# Axios API Configuration

This directory contains the axios configuration and API utilities for the Cheetah Front Desk application.

## Files

- `axios.ts` - Main axios configuration with interceptors and API methods
- `README.md` - This documentation file

## Features

### Axios Configuration (`axios.ts`)

- **Automatic base URL resolution** from environment variables
- **Request/Response interceptors** for logging and error handling
- **Automatic token management** with localStorage integration
- **Consistent error handling** with custom ApiError interface
- **TypeScript support** with proper typing

### API Methods

The `api` object provides convenient methods for HTTP requests:

```typescript
import { api } from '@renderer/lib/axios'

// GET request
const data = await api.get('/endpoint')

// POST request
const result = await api.post('/endpoint', { key: 'value' })

// PUT request
const updated = await api.put('/endpoint', { key: 'value' })

// DELETE request
await api.delete('/endpoint')

// PATCH request
const patched = await api.patch('/endpoint', { key: 'value' })
```

### Token Management

```typescript
import { setAuthToken } from '@renderer/lib/axios'

// Set token for future requests
setAuthToken('your-jwt-token')

// Clear token
setAuthToken(null)
```

## Usage Examples

### Basic API Call

```typescript
import { api } from '@renderer/lib/axios'

const fetchUsers = async () => {
  try {
    const response = await api.get('/users')
    return response.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
    throw error
  }
}
```

### Using the useAxiosApi Hook

```typescript
import { useAxiosApi } from '@renderer/hooks/useAxiosApi'

const MyComponent = () => {
  const { get, post, loading, error } = useAxiosApi()

  const handleFetch = async () => {
    try {
      const data = await get('/users')
      console.log(data)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <div>
      <button onClick={handleFetch} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Users'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

### Using the Unified API Service

```typescript
import { useUnifiedApi } from '@renderer/hooks/useUnifiedApi'

const MyComponent = () => {
  const { getSettings, login, loading, error } = useUnifiedApi()

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' })
      // Login successful
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <div>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  )
}
```

## Migration from useApi

The old `useApi` hook has been updated to use axios internally but is marked as deprecated. To migrate:

### Before (deprecated)
```typescript
import { useApi } from '@renderer/hooks/useApi'

const { get, post, loading, error } = useApi()
```

### After (recommended)
```typescript
import { useAxiosApi } from '@renderer/hooks/useAxiosApi'
// or
import { useUnifiedApi } from '@renderer/hooks/useUnifiedApi'

const { get, post, loading, error } = useAxiosApi()
// or
const { getSettings, login, loading, error } = useUnifiedApi()
```

## Configuration

The axios instance is configured with:

- **Base URL**: Retrieved from environment variables via `getBaseUrl()`
- **Timeout**: 30 seconds
- **Default headers**: `Content-Type: application/json`
- **Request interceptor**: Adds Authorization header if token exists
- **Response interceptor**: Logs requests and transforms errors

## Error Handling

All API methods return consistent error objects:

```typescript
interface ApiError {
  message: string
  status?: number
  code?: string
}
```

## Environment Variables

The base URL is determined by the `BASE_URL` environment variable, with a fallback to `http://localhost:8000/api`.

