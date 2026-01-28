"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HMAC = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class HMAC {
    generate(data, key, algorithm = 'sha256') {
        const steps = [];
        const hmac = node_crypto_1.default.createHmac(algorithm, key);
        hmac.update(data);
        const result = hmac.digest();
        steps.push({
            name: `HMAC-${algorithm.toUpperCase()}`,
            description: `Generate HMAC using ${algorithm}`,
            input: `Key: ${key.toString('hex')}, Data: ${data.toString('hex')}`,
            output: result.toString('hex')
        });
        return { result, steps };
    }
}
exports.HMAC = HMAC;
