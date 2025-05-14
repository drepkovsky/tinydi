import { container } from "./ioc";
import { CustomContainer } from "./ioc";

// Basic services and types
type Config = {
	apiUrl: string;
	debug: boolean;
};

type ApiResponse = {
	data: {
		name: string;
		[key: string]: unknown;
	};
};

class Logger {
	constructor(private debug: boolean) {}

	log(message: string): void {
		if (this.debug) {
			console.log(`[DEBUG]: ${message}`);
		} else {
			console.log(message);
		}
	}
}

class ApiClient {
	constructor(
		private baseUrl: string,
		private logger: Logger,
	) {}

	async fetch(path: string): Promise<ApiResponse> {
		this.logger.log(`Fetching ${this.baseUrl}${path}`);
		return {
			data: {
				name: "John Doe",
				id: "mocked-id",
			},
		};
	}
}

class UserService {
	constructor(
		private api: ApiClient,
		private logger: Logger,
	) {}

	async getUser(id: string) {
		this.logger.log(`Getting user ${id}`);
		const response = await this.api.fetch(`/users/${id}`);
		return {
			id,
			name: response.data.name,
		};
	}
}

// 1. Basic sync registration
const configFactory = container.register(
	"config",
	() =>
		({
			apiUrl: "https://api.example.com",
			debug: true,
		}) satisfies Config,
);

const loggerFactory = container.register("logger", (container) => {
	const { config } = container.resolve([configFactory]);
	return new Logger(config.debug);
});

// 2. Async registration
const apiClientFactory = container.registerAsync(
	"apiClient",
	async (container) => {
		// We can safely use resolve() for sync dependencies
		const { config, logger } = container.resolve([
			configFactory,
			loggerFactory,
		]);

		// Simulate async initialization
		await new Promise((resolve) => setTimeout(resolve, 100));
		return new ApiClient(config.apiUrl, logger);
	},
);

const userServiceFactory = container.registerAsync(
	"userService",
	async (container) => {
		// For mixed sync/async dependencies, use resolveAsync
		const { logger, apiClient } = await container.resolveAsync([
			loggerFactory,
			apiClientFactory,
		]);
		return new UserService(apiClient, logger);
	},
);

// Example showing all use cases
async function runExample() {
	// 1. Sync resolution
	const syncResolved = container.resolve([
		configFactory,
		loggerFactory,
		apiClientFactory,
	]);
	syncResolved.logger.log("Configuration loaded"); // Direct access to sync services
	// we need to await the apiClient because it's returnes as a Promise<ApiClient>
	const awaitedAPiClient = await syncResolved.apiClient;
	await awaitedAPiClient.fetch("/test");

	// 2. Async resolution (automatically awaits all async dependencies)
	const services = await container.resolveAsync([
		loggerFactory,
		apiClientFactory,
		userServiceFactory,
	]);

	// All services are ready to use (no awaits needed)
	services.logger.log("All services initialized");
	await services.apiClient.fetch("/test");
	await services.userService.getUser("123");

	// 3. Singleton behavior
	const { logger: logger2 } = container.resolve([loggerFactory]);
	console.log(services.logger === logger2); // true

	// 4. Instance clearing
	container.clearInstance("logger");
	const { logger: logger3 } = container.resolve([loggerFactory]);
	console.log(services.logger === logger3); // false

	// 5. Testing setup
	container.clearAllInstances();

	// Register mock before the real implementation
	// ideally in a test setup, must be first import
	container.register("logger", () => ({
		log: (message: string) => console.log("MOCK:", message),
	}));

	// Service will automatically use our mock
	const { userService } = await container.resolveAsync([userServiceFactory]);
	await userService.getUser("test-123");

	// 6. Using reference feature
	// Example of using references to resolve factories by name instead of factory object

	// Type-safe references with generic type parameter or without
	const configRef = container.reference<typeof configFactory>("config");
	const loggerRef = container.reference("logger");
	const typeSafeLoggerRef = container.reference<typeof loggerFactory>("logger");

	// Can mix factory objects and references in the same resolve call
	const servicesWithRef = container.resolve([configRef, loggerFactory]);
	console.log("Logger from mixed reference/factory:", servicesWithRef.logger);

	// Can use references alone
	const servicesFromRefs = container.resolve([configRef, loggerRef]);
	// @ts-expect-error - logger is unknown because we don't have type-safety on the reference
	servicesFromRefs.logger.log("Services resolved only by reference names");
	// Works with async factories too
	const apiClientRef =
		container.reference<typeof apiClientFactory>("apiClient");
	const userServiceRef =
		container.reference<typeof userServiceFactory>("userService");

	// Mix async and sync references
	const asyncServicesWithRefs = await container.resolveAsync([
		typeSafeLoggerRef,
		apiClientRef,
		userServiceRef,
	]);

	asyncServicesWithRefs.logger.log("Using references for async resolution");
	await asyncServicesWithRefs.userService.getUser("via-reference");

	// References work with typings - these should all be properly typed
	const user = await asyncServicesWithRefs.userService.getUser("typed-example");
	console.log(`User ${user.name} with ID ${user.id} fetched via reference`);
}

// Run the example
if (require.main === module) {
	void runExample();
}
