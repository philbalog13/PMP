"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationRule = void 0;
const AbstractRule_1 = require("./AbstractRule");
class LocationRule extends AbstractRule_1.AbstractRule {
    id = 'RULE_SUSPICIOUS_LOCATION';
    name = 'Suspicious Location Check';
    description = 'Flag transactions from high-risk countries';
    priority = 40;
    category = 'FRAUD';
    // Configurable high risk countries
    highRiskCountries = ['NK', 'IR', 'SY'];
    constructor() {
        super('59', 'Suspected fraud - location', 'DENY');
    }
    condition = (ctx) => {
        return this.highRiskCountries.includes(ctx.transaction.location?.country || '');
    };
}
exports.LocationRule = LocationRule;
//# sourceMappingURL=LocationRule.js.map