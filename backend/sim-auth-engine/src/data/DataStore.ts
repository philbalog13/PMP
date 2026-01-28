import fs from 'fs';
import path from 'path';
import { AuthorizationRule } from '../models';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'rules-storage.json');

export class DataStore {
    static async saveRules(rules: AuthorizationRule[]): Promise<void> {
        try {
            const dir = path.dirname(STORAGE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
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

            await fs.promises.writeFile(STORAGE_FILE, JSON.stringify(serialized, null, 2));
        } catch (error) {
            console.error('Failed to save rules to disk:', error);
        }
    }

    static async loadRules(): Promise<Partial<AuthorizationRule>[]> {
        try {
            if (!fs.existsSync(STORAGE_FILE)) return [];
            const content = await fs.promises.readFile(STORAGE_FILE, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load rules from disk:', error);
            return [];
        }
    }
}
