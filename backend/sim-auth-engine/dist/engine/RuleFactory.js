"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleFactory = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
class RuleFactory {
    static createConditionFromDefinition(code, params = {}) {
        switch (code) {
            case 'AMOUNT_ABOVE':
                return (ctx) => ctx.transaction.amount > (params.threshold || 0);
            case 'AMOUNT_BELOW':
                return (ctx) => ctx.transaction.amount < (params.threshold || 0);
            case 'MCC_IN':
                return (ctx) => (params.mccs || []).includes(ctx.transaction.mcc);
            case 'MERCHANT_IN':
                return (ctx) => (params.merchants || []).includes(ctx.transaction.merchantId);
            case 'COUNTRY_IN':
                return (ctx) => (params.countries || []).includes(ctx.transaction.location?.country || '');
            case 'CARD_TYPE':
                return (ctx) => ctx.card.cardType === params.type;
            case 'TIME_RANGE':
                return (ctx) => {
                    const hour = (0, dayjs_1.default)(ctx.timestamp).hour();
                    return hour >= (params.startHour || 0) && hour < (params.endHour || 24);
                };
            case 'ALWAYS_TRUE': return () => true;
            case 'ALWAYS_FALSE': return () => false;
            default: return () => false;
        }
    }
}
exports.RuleFactory = RuleFactory;
//# sourceMappingURL=RuleFactory.js.map