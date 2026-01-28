"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractRule = void 0;
class AbstractRule {
    enabled = true;
    action = 'DENY';
    responseCode;
    responseMessage;
    createdAt = new Date();
    updatedAt = new Date();
    constructor(responseCode, responseMessage, action = 'DENY') {
        this.responseCode = responseCode;
        this.responseMessage = responseMessage;
        this.action = action;
    }
}
exports.AbstractRule = AbstractRule;
//# sourceMappingURL=AbstractRule.js.map