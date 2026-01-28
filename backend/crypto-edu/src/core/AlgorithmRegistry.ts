export class AlgorithmRegistry {
    private algorithms: Map<string, any> = new Map();

    register(name: string, implementation: any) {
        this.algorithms.set(name, implementation);
    }

    get(name: string) {
        return this.algorithms.get(name);
    }

    listAlgorithms(): string[] {
        return Array.from(this.algorithms.keys());
    }
}
