# Database Module Structure

This directory contains the refactored database functionality, separated into logical modules for better maintainability.

## Structure

```
src/main/
├── database/
│   ├── connection.ts      # Database connection management
│   ├── migrations.ts      # Database schema migrations
│   ├── types.ts          # Database interfaces and types
│   └── README.md         # This file
├── services/
│   ├── products.ts       # Product-related operations
│   ├── settings.ts       # Settings-related operations
│   └── ...              # Other service modules
├── handlers/
│   └── ipcHandlers.ts    # IPC communication handlers
└── db-new.ts             # Main orchestrator (replaces old db.ts)
```

## Modules

### `connection.ts`
- Database connection initialization
- Connection state management
- Base URL configuration
- File path management

### `migrations.ts`
- All database schema migrations
- Automatic table creation
- Migration state tracking
- Missing table detection and recovery

### `types.ts`
- All database record interfaces
- Type definitions for database operations
- Shared types across modules

### `services/`
- Business logic for different entities
- Database CRUD operations
- API integration logic
- Data transformation

### `handlers/`
- IPC communication between main and renderer
- Request/response handling
- Error handling and logging

## Benefits of This Structure

1. **Maintainability**: Each module has a single responsibility
2. **Readability**: Easier to find and understand specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: New features can be added without cluttering existing code
5. **Reusability**: Common functionality can be shared across modules

## Migration from Old Structure

The old `db.ts` file (2400+ lines) has been replaced with:
- **`db-new.ts`**: Main orchestrator (~80 lines)
- **Separated modules**: Each handling specific concerns
- **Clean imports**: Clear dependencies between modules

## Usage

```typescript
// Import the main database module
import { initDatabase, closeDatabase } from './db-new'

// Initialize database
initDatabase()

// Close database on app shutdown
app.on('before-quit', () => {
  closeDatabase()
})
```

## Adding New Features

1. **New Entity**: Create a new service in `services/`
2. **New API**: Add handlers in `handlers/ipcHandlers.ts`
3. **New Types**: Add interfaces in `database/types.ts`
4. **New Tables**: Add migrations in `database/migrations.ts`
