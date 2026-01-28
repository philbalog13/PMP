export class Padding {
    static padISO9797Method1(data: Buffer): Buffer {
        const diff = data.length % 8;
        if (diff === 0) return data;
        return Buffer.concat([data, Buffer.alloc(8 - diff, 0)]);
    }

    static padPKCS7(data: Buffer, blockSize: number = 8): Buffer {
        const padding = blockSize - (data.length % blockSize);
        const padBuffer = Buffer.alloc(padding, padding);
        return Buffer.concat([data, padBuffer]);
    }
}
