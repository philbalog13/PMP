import { RuleDefinition, AuthorizationRule, AuthorizationContext } from '../models';
import { RuleConditionDSL } from './RuleParser';
import dayjs from 'dayjs';

export class RuleFactory {
    static createConditionFromDefinition(code: string, params: Record<string, unknown> = {}): (ctx: AuthorizationContext) => boolean {
        switch (code) {
            case 'AMOUNT_ABOVE':
                return (ctx) => ctx.transaction.amount > (params.threshold as number || 0);
            case 'AMOUNT_BELOW':
                return (ctx) => ctx.transaction.amount < (params.threshold as number || 0);
            case 'MCC_IN':
                return (ctx) => (params.mccs as string[] || []).includes(ctx.transaction.mcc);
            case 'MERCHANT_IN':
                return (ctx) => (params.merchants as string[] || []).includes(ctx.transaction.merchantId);
            case 'COUNTRY_IN':
                return (ctx) => (params.countries as string[] || []).includes(ctx.transaction.location?.country || '');
            case 'CARD_TYPE':
                return (ctx) => ctx.card.cardType === (params.type as string);
            case 'TIME_RANGE':
                return (ctx) => {
                    const hour = dayjs(ctx.timestamp).hour();
                    return hour >= (params.startHour as number || 0) && hour < (params.endHour as number || 24);
                };
            case 'ALWAYS_TRUE': return () => true;
            case 'ALWAYS_FALSE': return () => false;
            default: return () => false;
        }
    }
}
