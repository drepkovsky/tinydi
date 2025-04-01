export type SyncFactory<
	T,
	N extends string = string,
	C extends Container = Container,
> = {
	name: N;
	resolve: (container: C) => T;
};

export type AsyncFactory<
	T,
	N extends string = string,
	C extends Container = Container,
> = {
	name: N;
	resolve: (container: C) => Promise<T>;
};

export type Factory<
	T,
	N extends string = string,
	C extends Container = Container,
> = SyncFactory<T, N, C> | AsyncFactory<T, N, C>;
export type FactoryValue = unknown;

// Types for resolve results
export type SyncResolveResult<
	T extends (
		| SyncFactory<unknown, string>
		| FactoryReference<SyncFactory<unknown, string>>
	)[],
> = {
	[F in T[number] as F extends FactoryReference<infer R>
		? R["name"]
		: F["name"]]: F extends FactoryReference<infer R>
		? R extends SyncFactory<infer V, string>
			? V
			: ReturnType<R["resolve"]>
		: F extends SyncFactory<infer V, string>
			? V
			: never;
};

type AsyncResolveResult<
	T extends (
		| Factory<unknown, string>
		| FactoryReference<Factory<unknown, string>>
	)[],
> = {
	[F in T[number] as F extends FactoryReference<infer R>
		? R["name"]
		: F["name"]]: F extends FactoryReference<infer R>
		? R extends Factory<infer V, string>
			? V
			: ReturnType<R["resolve"]>
		: F extends Factory<infer V, string>
			? V
			: never;
};

// New type for reference factories
export type FactoryReference<F extends Factory<unknown, string>> = {
	readonly name: string;
	readonly __REF: F; // Type helper field to preserve factory type
};

export class Container {
	protected factories: Map<string, Factory<FactoryValue, any>> = new Map();
	protected instances: Map<string, Promise<FactoryValue> | FactoryValue> =
		new Map();

	public register<T, N extends string>(
		name: N,
		resolver: (container: any) => T,
	): SyncFactory<T, N, any> {
		const factory: SyncFactory<T, N, any> = {
			name,
			resolve: resolver,
		};
		this.factories.set(name, factory as unknown as Factory<FactoryValue>);
		return factory;
	}

	public registerAsync<T, N extends string>(
		name: N,
		resolver: (container: any) => Promise<T>,
	): AsyncFactory<T, N, any> {
		const factory: AsyncFactory<T, N, any> = {
			name,
			resolve: resolver,
		};
		this.factories.set(name, factory as unknown as Factory<FactoryValue>);
		return factory;
	}

	// Improved reference method with better type preservation
	public reference<F extends Factory<unknown, string>>(
		name: string,
	): FactoryReference<F> {
		// Create a reference factory that will be resolved to a real factory at runtime
		return {
			name,
			__REF: true as any, // This field is only used at type level and not at runtime
		};
	}

	protected resolveFactory<T>(factory: SyncFactory<T, any>): T;
	protected resolveFactory<T>(factory: AsyncFactory<T, any>): Promise<T>;
	protected resolveFactory<T>(
		factory: Factory<T, any> | FactoryReference<Factory<T, any>>,
	): T | Promise<T> {
		let actualFactory: Factory<T, any> = factory as Factory<T, any>;
		// Check if it's a reference and get the actual factory
		if ("__REF" in factory && factory.__REF) {
			const tmp = this.factories.get(factory.name);
			if (!tmp) {
				throw new Error(`Factory with name "${factory.name}" not found`);
			}
			// Replace the reference with the actual factory
			actualFactory = tmp as unknown as Factory<T, any>;
		}

		const existingInstance = this.instances.get(factory.name);
		if (existingInstance !== undefined) {
			return existingInstance as T | Promise<T>;
		}

		const result = actualFactory.resolve(this);
		this.instances.set(actualFactory.name, result);
		return result;
	}

	public resolve<
		T extends (
			| SyncFactory<unknown, any>
			| FactoryReference<SyncFactory<unknown, any>>
		)[],
	>(
		factories: [...T],
	): SyncResolveResult<
		Extract<
			T[number],
			SyncFactory<unknown, any> | FactoryReference<SyncFactory<unknown, any>>
		>[]
	> {
		const result = {} as Record<string, FactoryValue>;

		for (const factory of factories) {
			result[factory.name] = this.resolveFactory(
				factory as SyncFactory<unknown, any>,
			);
		}

		return result as SyncResolveResult<
			Extract<
				T[number],
				SyncFactory<unknown, any> | FactoryReference<SyncFactory<unknown, any>>
			>[]
		>;
	}

	public async resolveAsync<
		T extends (
			| Factory<unknown, any>
			| FactoryReference<Factory<unknown, any>>
		)[],
	>(
		factories: [...T],
	): Promise<
		AsyncResolveResult<
			Extract<
				T[number],
				Factory<unknown, any> | FactoryReference<Factory<unknown, any>>
			>[]
		>
	> {
		const result = {} as Record<string, FactoryValue>;
		const promises: Promise<void>[] = [];

		for (const factory of factories) {
			const resolved = this.resolveFactory(factory as Factory<unknown, any>);
			if (resolved instanceof Promise) {
				promises.push(
					resolved.then((value) => {
						result[factory.name] = value;
					}),
				);
			} else {
				result[factory.name] = resolved;
			}
		}

		await Promise.all(promises);
		return result as AsyncResolveResult<
			Extract<
				T[number],
				Factory<unknown, any> | FactoryReference<Factory<unknown, any>>
			>[]
		>;
	}

	public clearInstance(name: string): void {
		this.instances.delete(name);
	}

	public clearAllInstances(): void {
		this.instances.clear();
	}
}

export const createContainer = (): Container => {
	return new Container();
};
