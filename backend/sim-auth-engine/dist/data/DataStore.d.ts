import { AuthorizationRule } from '../models';
export declare class DataStore {
    static saveRules(rules: AuthorizationRule[]): Promise<void>;
    static loadRules(): Promise<Partial<AuthorizationRule>[]>;
}
//# sourceMappingURL=DataStore.d.ts.map