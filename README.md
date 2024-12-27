# tinydi

A lightweight, type-safe dependency injection container for TypeScript with explicit sync/async handling.

## Features

- 🚀 Lightweight and simple API
- 🔒 Type-safe dependency resolution
- ⚡️ Explicit sync/async handling
- 🦥 Lazy singleton resolution
- 🧪 Easy testing with dependency overrides
- 📦 No decorators or reflection required

## Installation

```bash
npm install @drepkovsky/tinydi
```

## Quick Start

```typescript
import { container } from './ioc';

// Register sync dependencies
const loggerFactory = container.register('logger', () => new Logger());

// Register async dependencies
const userServiceFactory = container.registerAsync('userService', 
    async (container) => {
        const { logger } = container.resolve([loggerFactory]);
        return new UserService(logger);
    }
);

// Sync resolution
const { logger } = container.resolve([loggerFactory]);
logger.log('works!');

// Async resolution (automatically awaits all dependencies)
const { logger, userService } = await container.resolveAsync([
    loggerFactory,
    userServiceFactory
]);
```

## Container Setup

Create a single container instance for your application:

```typescript
// ioc.ts
import { createContainer } from '@drepkovsky/tinydi';
export const container = createContainer();
```

## Registration

### Sync Registration

Use `register` for synchronous dependencies:

```typescript
const configFactory = container.register('config', () => ({
    apiUrl: 'https://api.example.com'
}));

const loggerFactory = container.register('logger', (container) => {
    const { config } = container.resolve([configFactory]);
    return new Logger(config);
});
```

### Async Registration

Use `registerAsync` for dependencies that require async initialization:

```typescript
const dbFactory = container.registerAsync('db', async (container) => {
    const { config } = container.resolve([configFactory]);
    const connection = await createConnection(config.dbUrl);
    return new Database(connection);
});
```

## Resolution

### Sync Resolution

Use `resolve` for synchronous dependencies:

```typescript
const { config, logger } = container.resolve([configFactory, loggerFactory]);
// Both config and logger are immediately available
logger.log(config.apiUrl);
```

### Async Resolution

Use `resolveAsync` for mixed sync/async dependencies:

```typescript
const services = await container.resolveAsync([
    configFactory,
    loggerFactory,
    dbFactory
]);
// All services are resolved (no more awaits needed)
services.logger.log(services.config.apiUrl);
services.db.query('SELECT * FROM users');
```

## Singleton Behavior

Dependencies are cached by default:

```typescript
const { logger: logger1 } = container.resolve([loggerFactory]);
const { logger: logger2 } = container.resolve([loggerFactory]);
console.log(logger1 === logger2); // true

// Clear specific instance
container.clearInstance('logger');

// Clear all instances
container.clearAllInstances();
```

## Testing

Register mocks by overriding dependencies. Important: Register mocks before any real implementations are used:

```typescript
// In your test setup (before any other imports)
import { container } from './ioc';

// Register mocks first
container.register('logger', () => ({
    log: (message) => console.log('MOCK:', message)
}));

// Later imports/usage will automatically use the mock
import { userService } from './services';
// userService will use the mocked logger
```

## Best Practices

1. **Container Setup**
   - Create a single container instance
   - Export it from a dedicated `ioc.ts` file

2. **Registration**
   - Use `register` for sync dependencies
   - Use `registerAsync` for async dependencies
   - Keep factory names consistent with service names

3. **Resolution**
   - Use `resolve` for sync-only dependencies
   - Use `resolveAsync` for mixed sync/async dependencies
   - Let TypeScript guide you on which to use

4. **Testing**
   - Register mocks before any real implementations
   - Register mocks in test setup files
   - Use `clearAllInstances` between tests
   - Keep mocks simple and focused

## API Reference

### Container Methods

#### Registration
- `register<T>(name: string, resolver: (container: Container) => T)`
- `registerAsync<T>(name: string, resolver: (container: Container) => Promise<T>)`

#### Resolution
- `resolve<T>(factories: Factory[]): SyncResult<T>`
- `resolveAsync<T>(factories: Factory[]): Promise<AsyncResult<T>>`

#### Instance Management
- `clearInstance(name: string): void`
- `clearAllInstances(): void`

## License

MIT 