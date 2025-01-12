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
export type SyncResolveResult<T extends SyncFactory<unknown, string>[]> = {
	[F in T[number] as F["name"]]: ReturnType<F["resolve"]>;
};

type AsyncResolveResult<T extends Factory<unknown, string>[]> = {
	[F in T[number] as F["name"]]: F extends AsyncFactory<infer R, string>
		? R
		: ReturnType<F["resolve"]>;
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

	protected resolveFactory<T>(factory: SyncFactory<T, any>): T;
	protected resolveFactory<T>(factory: AsyncFactory<T, any>): Promise<T>;
	protected resolveFactory<T>(factory: Factory<T, any>): T | Promise<T> {
		const existingInstance = this.instances.get(factory.name);
		if (existingInstance !== undefined) {
			return existingInstance as T | Promise<T>;
		}

		const result = factory.resolve(this);
		this.instances.set(factory.name, result);
		return result;
	}

	public resolve<T extends SyncFactory<unknown, any>[]>(
		factories: [...T],
	): SyncResolveResult<T> {
		const result = {} as Record<string, FactoryValue>;

		for (const factory of factories) {
			result[factory.name] = this.resolveFactory(
				factory as SyncFactory<unknown>,
			);
		}

		return result as SyncResolveResult<T>;
	}

	public async resolveAsync<T extends Factory<unknown, any>[]>(
		factories: [...T],
	): Promise<AsyncResolveResult<T>> {
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
		return result as AsyncResolveResult<T>;
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
