# tinydi

A 967B lightweight, type-safe dependency injection container for TypeScript with explicit sync/async handling.

## Features

- 🚀 967B ultra lightweight with no dependencies
- 🔒 Type-safe dependency resolution
- ⚡️ Explicit sync/async handling
- 🦥 Lazy singleton resolution
- 🧪 Easy testing with dependency overrides
- 📦 No decorators or reflection required
- 🔗 Resolve by reference with full type safety
- 🔧 Extensible through inheritance

## Installation

```bash
npm install @drepkovsky/tinydi
```

## Quick Start

```typescript
import { Container } from '@drepkovsky/tinydi';

// Create container instance
const container = new Container();

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

// Resolve by reference (decouple components)
const loggerRef = container.reference<typeof loggerFactory>('logger');
const { logger: loggerFromRef } = container.resolve([loggerRef]);
```

## Container Setup

Create a single container instance for your application:

```typescript
// ioc.ts
import { Container } from '@drepkovsky/tinydi';
export const container = new Container();
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

You can also resolve async factories with the sync resolver, but they will return a Promise that needs to be awaited:

```typescript
const { config, logger, db } = container.resolve([configFactory, loggerFactory, dbFactory]);
// config and logger are immediately available
logger.log(config.apiUrl);

// db is a Promise<Database> that needs to be awaited
const database = await db;
await database.query('SELECT * FROM users');
```

The type system will correctly indicate that the async factories return Promises, ensuring you don't forget to await them.

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

### Reference Resolution

Use `reference` to resolve factories by name instead of direct factory objects:

```typescript
// Create type-safe references with generic type parameter
const loggerRef = container.reference<typeof loggerFactory>('logger');
const dbRef = container.reference<typeof dbFactory>('db');

// Create reference without type safety
const simpleLoggerRef = container.reference('logger'); // Works, but loses type information

// Resolve using references (promotes loose coupling)
const { logger } = container.resolve([loggerRef]);
const { db } = await container.resolveAsync([dbRef]);

// Mix references and factory objects
const services = await container.resolveAsync([
    loggerRef,          // Reference by name
    dbFactory           // Direct factory reference
]);
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

// References make testing even easier - no need to import actual factories
const userServiceRef = container.reference('userService');
const { userService: mockedUserService } = await container.resolveAsync([userServiceRef]);
```

## Extending the Container

You can extend the `Container` class to add custom functionality:

```typescript
import { Container } from '@drepkovsky/tinydi';

class CustomContainer extends Container {
  // Add custom methods
  registerSingleton<T, N extends string>(
    name: N,
    instance: T
  ) {
    // Register a pre-created instance
    return this.register(name, () => instance);
  }
  
  // Add environment-specific functionality
  registerConfig() {
    return this.register('config', () => ({
      apiUrl: process.env.API_URL || 'https://api.example.com',
      debug: process.env.NODE_ENV !== 'production'
    }));
  }
  
  // Add shortcuts for common patterns
  registerRepository<TImp, TName extends string>(entityName: TName, implementation: new () => TImp) {
    return this.register(`${entityName}Repository` as const, () => new implementation());
  }
}

// Create and use your custom container
const customContainer = new CustomContainer();
export { customContainer as container };

// Register repositories
const userRepositoryFactory = customContainer.registerRepository('user', UserRepository);
const postRepositoryFactory = customContainer.registerRepository('post', PostRepository);

// Resolve repositories
// userRepository and postRepository are immediately available and typed properly
const { userRepository, postRepository } = await customContainer.resolveAsync([
    userRepositoryFactory,
    postRepositoryFactory
]);
```

## Best Practices

1. **Container Setup**
   - Create a single container instance
   - Export it from a dedicated `ioc.ts` file
   - Consider extending the Container class for project-specific needs

2. **Registration**
   - Use `register` for sync dependencies
   - Use `registerAsync` for async dependencies
   - Keep factory names consistent with service names

3. **Resolution**
   - Use `resolve` for sync-only dependencies or when you want to handle Promises manually
   - Use `resolveAsync` for mixed sync/async dependencies when you want all dependencies resolved
   - Remember that async factories resolved with `resolve()` return Promises that need to be awaited

4. **References**
   - Use references to decouple components
   - Prefer references in consumer code to avoid direct factory imports
   - Add generic type parameter for full type safety (`reference<typeof factoryName>`)
   - Be aware that omitting the generic type (`reference('name')`) loses type safety

5. **Testing**
   - Register mocks before any real implementations
   - Register mocks in test setup files
   - Use `clearAllInstances` between tests
   - Keep mocks simple and focused
   - Use references to minimize imports in tests

## Type Safety

The library is designed to be fully type-safe:

- Factory registration preserves return types
- Resolution methods infer types from registered factories
- References maintain type safety when used with generics
- Async factories return Promise<T> when resolved with sync resolver

```typescript
// Type-safe reference (recommended)
const userServiceRef = container.reference<typeof userServiceFactory>('userService');
const { userService } = await container.resolveAsync([userServiceRef]);
// userService has the correct type here

// Non-type-safe reference 
const looseRef = container.reference('userService');
const { userService: looseUserService } = await container.resolveAsync([looseRef]);
// looseUserService has an 'unknown' type here

// Resolving async factories with sync resolver
const { apiClient } = container.resolve([apiClientFactory]);
// apiClient is typed as Promise<ApiClient>, requiring an await
const client = await apiClient;
```

## API Reference

### Container Methods

#### Registration
- `register<T, N>(name: N, resolver: (container: Container) => T): SyncFactory<T, N>`
- `registerAsync<T, N>(name: N, resolver: (container: Container) => Promise<T>): AsyncFactory<T, N>`

#### Resolution
- `resolve<T>(factories: Factory[]): SyncResult<T>` - Returns direct values for sync factories and Promises for async factories
- `resolveAsync<T>(factories: Factory[]): Promise<AsyncResult<T>>` - Awaits all factories (both sync and async)
- `reference<F>(name: string): FactoryReference<F>` - Create a type-safe reference to a factory by name
- `reference(name: string): FactoryReference<unknown>` - Create a reference without type safety

#### Instance Management
- `clearInstance(name: string): void`
- `clearAllInstances(): void`

## Migration to 2.0.0

Version 2.0.0 introduces a breaking change in how the container is created. The `createContainer` function has been removed in favor of direct `Container` instantiation:

```typescript
// Before (v1.x)
import { createContainer } from '@drepkovsky/tinydi';
const container = createContainer();

// After (v2.x)
import { Container } from '@drepkovsky/tinydi';
const container = new Container();
```

This change was made to:
- Encourage extending the `Container` class for custom functionality
- Make it more explicit that you can create your own container implementations
- Better align with object-oriented principles
- Make customization patterns more discoverable through IDE suggestions

By using direct class instantiation, it's more apparent that you can extend the container with your own methods and functionality, as shown in the [Extending the Container](#extending-the-container) section.

## License

MIT 
