"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHA = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class SHA {
    hash(data, algorithm = 'sha256') {
        const steps = [];
        const hash = node_crypto_1.default.createHash(algorithm);
        hash.update(data);
        const result = hash.digest();
        steps.push({
            name: `${algorithm.toUpperCase()} Hash`,
            description: `Calculate ${algorithm} hash`,
            input: data.toString('hex'),
            output: result.toString('hex')
        });
        return { result, steps };
    }
}
exports.SHA = SHA;
