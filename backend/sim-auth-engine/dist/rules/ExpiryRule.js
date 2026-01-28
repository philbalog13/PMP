"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpiryRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
const database_1 = require("../database");
class ExpiryRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_EXPIRED_CARD';
    name = 'Expired Card Check';
    description = 'Decline if card has expired';
    priority = 5;
    category = 'CARD_STATUS';
    constructor() {
        super('54', 'Expired card', 'DENY');
    }
    condition = (ctx) => {
        const { card } = ctx;
        return database_1.database.cards.isExpired(card) || card.status === 'EXPIRED';
    };
}
exports.ExpiryRule = ExpiryRule;
//# sourceMappingURL=ExpiryRule.js.map