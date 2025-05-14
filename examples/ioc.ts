import { Container } from "../src";

// Create a single container instance for the entire application
export const container = new Container();

export class CustomContainer extends Container {
	tags: Record<string, string[]> = {};

	define<T>(name: string, definition: (container: this) => T, tag?: string) {
		if (tag) {
			this.tags[tag] = [...(this.tags[tag] || []), name];
		}
		return this.register(name, definition);
	}

	getByTag(tag: string) {
		return this.tags[tag]?.map((n) => this.resolve([this.reference(n)])) ?? [];
	}
}
