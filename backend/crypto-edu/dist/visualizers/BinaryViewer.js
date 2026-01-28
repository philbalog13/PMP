"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryViewer = void 0;
class BinaryViewer {
    static viewBinary(buffer) {
        return buffer.toJSON().data.map(b => b.toString(2).padStart(8, '0')).join(' ');
    }
}
exports.BinaryViewer = BinaryViewer;
