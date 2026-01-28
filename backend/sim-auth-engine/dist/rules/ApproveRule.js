"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproveRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class ApproveRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_APPROVE_DEFAULT';
    name = 'Default Approval';
    description = 'Approve transaction if no other rules matched';
    priority = 999;
    category = 'CUSTOM';
    constructor() {
        super('00', 'Approved', 'APPROVE');
    }
    condition = () => true;
}
exports.ApproveRule = ApproveRule;
//# sourceMappingURL=ApproveRule.js.map