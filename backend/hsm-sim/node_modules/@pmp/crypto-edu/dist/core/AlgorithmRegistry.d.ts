export declare class AlgorithmRegistry {
    private algorithms;
    register(name: string, implementation: any): void;
    get(name: string): any;
    listAlgorithms(): string[];
}
