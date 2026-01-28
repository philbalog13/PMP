"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Padding = void 0;
class Padding {
    static padISO9797Method1(data) {
        const diff = data.length % 8;
        if (diff === 0)
            return data;
        return Buffer.concat([data, Buffer.alloc(8 - diff, 0)]);
    }
    static padPKCS7(data, blockSize = 8) {
        const padding = blockSize - (data.length % blockSize);
        const padBuffer = Buffer.alloc(padding, padding);
        return Buffer.concat([data, padBuffer]);
    }
}
exports.Padding = Padding;
