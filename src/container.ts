type SyncFactory<
	T,
	C extends Container = Container,
	N extends string = string,
> = {
	name: N;
	resolve: (container: C) => T;
};

type AsyncFactory<
	T,
	C extends Container = Container,
	N extends string = string,
> = {
	name: N;
	resolve: (container: C) => Promise<T>;
};

type Factory<T, C extends Container = Container, N extends string = string> =
	| SyncFactory<T, C, N>
	| AsyncFactory<T, C, N>;
type FactoryValue = unknown;

// Types for resolve results
type SyncResolveResult<
	C extends Container,
	T extends SyncFactory<unknown, C, string>[],
> = {
	[F in T[number] as F["name"]]: ReturnType<F["resolve"]>;
};

type AsyncResolveResult<
	C extends Container,
	T extends Factory<unknown, C, string>[],
> = {
	[F in T[number] as F["name"]]: F extends AsyncFactory<infer R, C, string>
		? R
		: ReturnType<F["resolve"]>;
};

export class Container {
	protected factories: Map<string, Factory<FactoryValue, typeof this>> =
		new Map();
	protected instances: Map<string, Promise<FactoryValue> | FactoryValue> =
		new Map();

	public register<T, N extends string>(
		name: N,
		resolver: (container: typeof this) => T,
	): SyncFactory<T, typeof this, N> {
		const factory: SyncFactory<T, typeof this, N> = {
			name,
			resolve: resolver,
		};
		this.factories.set(name, factory as unknown as Factory<FactoryValue>);
		return factory;
	}

	public registerAsync<T, N extends string>(
		name: N,
		resolver: (container: typeof this) => Promise<T>,
	): AsyncFactory<T, typeof this, N> {
		const factory: AsyncFactory<T, typeof this, N> = {
			name,
			resolve: resolver,
		};
		this.factories.set(name, factory as unknown as Factory<FactoryValue>);
		return factory;
	}

	protected resolveFactory<T>(factory: SyncFactory<T, typeof this>): T;
	protected resolveFactory<T>(
		factory: AsyncFactory<T, typeof this>,
	): Promise<T>;
	protected resolveFactory<T>(
		factory: Factory<T, typeof this>,
	): T | Promise<T> {
		const existingInstance = this.instances.get(factory.name);
		if (existingInstance !== undefined) {
			return existingInstance as T | Promise<T>;
		}

		const result = factory.resolve(this);
		this.instances.set(factory.name, result);
		return result;
	}

	public resolve<T extends SyncFactory<unknown, typeof this>[]>(
		factories: [...T],
	): SyncResolveResult<typeof this, T> {
		const result = {} as Record<string, FactoryValue>;

		for (const factory of factories) {
			result[factory.name] = this.resolveFactory(
				factory as SyncFactory<unknown>,
			);
		}

		return result as SyncResolveResult<typeof this, T>;
	}

	public async resolveAsync<T extends Factory<unknown, typeof this>[]>(
		factories: [...T],
	): Promise<AsyncResolveResult<typeof this, T>> {
		const result = {} as Record<string, FactoryValue>;
		const promises: Promise<void>[] = [];

		for (const factory of factories) {
			const resolved = this.resolveFactory(factory);
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
		return result as AsyncResolveResult<typeof this, T>;
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
