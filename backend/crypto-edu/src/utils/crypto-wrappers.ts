import crypto from 'node:crypto';

export function encryptDES(data: Buffer, key: Buffer): Buffer {
    const cipher = crypto.createCipheriv('des-ecb', key, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

export function decryptDES(data: Buffer, key: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('des-ecb', key, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function encryptTDES(data: Buffer, key: Buffer): Buffer {
    // Ensure key is 24 bytes (TDES-EDE3). If 16 bytes, duplicate first 8 bytes to end.
    let finalKey = key;
    if (key.length === 16) {
        finalKey = Buffer.concat([key, key.subarray(0, 8)]);
    }

    const cipher = crypto.createCipheriv('des-ede3', finalKey, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

export function decryptTDES(data: Buffer, key: Buffer): Buffer {
    let finalKey = key;
    if (key.length === 16) {
        finalKey = Buffer.concat([key, key.subarray(0, 8)]);
    }

    const decipher = crypto.createDecipheriv('des-ede3', finalKey, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}
