export class BinaryViewer {
    static viewBinary(buffer: Buffer): string {
        return buffer.toJSON().data.map(b => b.toString(2).padStart(8, '0')).join(' ');
    }
}
