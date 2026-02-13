"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
const dayjs_1 = __importDefault(require("dayjs"));
class TimeRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_UNUSUAL_TIME';
    name = 'Unusual Time Check';
    description = 'Flag transactions during unusual hours (e.g., 3AM - 5AM)';
    priority = 45;
    category = 'FRAUD';
    constructor() {
        super('63', 'Security violation', 'DENY');
    }
    condition = (ctx) => {
        const hour = (0, dayjs_1.default)(ctx.timestamp).hour();
        // Block between 3 AM and 5 AM only for high-value operations.
        // This keeps regular pedagogical flows usable at any hour.
        return hour >= 3 && hour < 5 && ctx.transaction.amount >= 300;
    };
}
exports.TimeRule = TimeRule;
//# sourceMappingURL=TimeRule.js.map