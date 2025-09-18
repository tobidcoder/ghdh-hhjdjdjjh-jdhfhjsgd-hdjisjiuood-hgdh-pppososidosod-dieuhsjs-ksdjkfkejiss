# Flexible API Service Layer

This directory contains the updated service layer that can handle different API response structures and gracefully fallback when data doesn't match expected formats.

## Key Features

### 1. Flexible API Client (`apiClient.ts`)

The `FlexibleApiClient` class provides:

- **Automatic response normalization** - Handles different API response structures
- **Flexible data extraction** - Tries multiple paths to extract data from responses
- **Fallback mechanisms** - Creates default data when API calls fail
- **Consistent error handling** - Standardized error responses across all services
- **Token management** - Automatic authentication header injection

### 2. Updated Services

The following services have been updated to use the flexible API client:

- **Settings Service** (`settings.ts`) - Business settings with fallback defaults
- **Countries Service** (`countries.ts`) - Country data with default countries
- **Warehouses Service** (`warehouses.ts`) - Warehouse data with default warehouse
- **Product Categories Service** (`productCategories.ts`) - Categories with default categories
- **Auth Service** (`auth.ts`) - Login with flexible response handling

### 3. Response Structure Handling

The system can now handle various API response formats:

```typescript
// Laravel-style responses
{
  "success": true,
  "data": {
    "attributes": { ... }
  }
}

// Direct data responses
{
  "data": { ... }
}

// Array responses
[{ ... }, { ... }]

// Nested responses
{
  "data": {
    "data": { ... }
  }
}
```

### 4. Fallback Data

Each service creates appropriate fallback data when:

- API calls fail
- Response structure doesn't match expected format
- No data is returned from the API

### 5. Data Extraction Methods

The API client provides several extraction methods:

- `extractData()` - Extract single data object
- `extractArrayData()` - Extract array data
- `extractSingleData()` - Extract single item
- `extractProperties()` - Extract multiple properties with fallbacks
- `safeExtract()` - Safe property extraction with fallback values

## Usage Example

```typescript
import { apiClient } from './apiClient'

// Make API call
const response = await apiClient.get('/settings')

// Extract data with fallbacks
const settings = apiClient.extractProperties(response, {
  currency: { path: 'data.attributes.currency', fallback: 'NGN' },
  company_name: { path: 'data.attributes.company_name', fallback: 'My Company' }
})
```

## Benefits

1. **Resilient** - App continues to work even when API responses change
2. **Flexible** - Handles different API response structures
3. **User-friendly** - Provides sensible defaults when data is missing
4. **Maintainable** - Centralized API handling logic
5. **Debuggable** - Comprehensive logging of API calls and responses

## Migration Notes

- All existing services maintain backward compatibility
- New services should use the `FlexibleApiClient`
- Fallback data ensures the app remains functional
- Error handling is improved with better user feedback

## Testing

The system has been designed to:

- Log all API calls and responses for debugging
- Create default data when APIs fail
- Handle various response structures gracefully
- Provide meaningful error messages

This ensures that the login flow and subsequent data fetching will work even if the API structure changes or if there are network issues.