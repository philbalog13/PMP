"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const STORAGE_FILE = path_1.default.join(process.cwd(), 'data', 'rules-storage.json');
class DataStore {
    static async saveRules(rules) {
        try {
            const dir = path_1.default.dirname(STORAGE_FILE);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            // We only save metadata, not the condition implementation (as it's a function)
            // For custom rules, we should check if they can vary. But here we assume
            // we persist configuration (enabled, priority) mainly. 
            // For real custom rules (DSL), we would save the definition.
            // Filter to save only what is needed/serializable
            const serialized = rules.map(r => ({
                id: r.id,
                priority: r.priority,
                enabled: r.enabled,
                // If it's a custom rule with a definition (not function), we save it
                // For now, simple persistence of state
            }));
            await fs_1.default.promises.writeFile(STORAGE_FILE, JSON.stringify(serialized, null, 2));
        }
        catch (error) {
            console.error('Failed to save rules to disk:', error);
        }
    }
    static async loadRules() {
        try {
            if (!fs_1.default.existsSync(STORAGE_FILE))
                return [];
            const content = await fs_1.default.promises.readFile(STORAGE_FILE, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Failed to load rules from disk:', error);
            return [];
        }
    }
}
exports.DataStore = DataStore;
//# sourceMappingURL=DataStore.js.map