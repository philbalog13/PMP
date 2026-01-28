import { AuthorizationContext } from '../models';
import { AbstractRule } from './AbstractRule';

export class LocationRule extends AbstractRule {
    id = 'RULE_SUSPICIOUS_LOCATION';
    name = 'Suspicious Location Check';
    description = 'Flag transactions from high-risk countries';
    priority = 40;
    category = 'FRAUD' as const;

    // Configurable high risk countries
    private highRiskCountries = ['NK', 'IR', 'SY'];

    constructor() {
        super('59', 'Suspected fraud - location', 'DENY');
    }

    condition = (ctx: AuthorizationContext) => {
        return this.highRiskCountries.includes(ctx.transaction.location?.country || '');
    };
}
