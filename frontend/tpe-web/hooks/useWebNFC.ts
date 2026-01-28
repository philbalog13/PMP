import { useState, useEffect, useCallback } from 'react';

interface UseWebNFCResult {
    supported: boolean;
    reading: boolean;
    error: string | null;
    startScan: () => Promise<void>;
    stopScan: () => void;
    simulateNFC: (data: string) => void;
}

export function useWebNFC(): UseWebNFCResult {
    const [supported, setSupported] = useState(false);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for Web NFC API support
        if ('NDEFReader' in window) {
            setSupported(true);
        }
    }, []);

    const startScan = useCallback(async () => {
        if (!supported) {
            setError('Web NFC not supported on this browser');
            return;
        }

        try {
            setReading(true);
            setError(null);

            // @ts-ignore - NDEFReader is experimental
            const ndef = new NDEFReader();
            await ndef.scan();

            ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
                console.log('NFC tag detected:', { serialNumber });

                for (const record of message.records) {
                    console.log('Record type:', record.recordType);
                    console.log('MIME type:', record.mediaType);
                    console.log('Record data:', record.data);
                }
            });

            ndef.addEventListener('readingerror', () => {
                setError('NFC read error');
                setReading(false);
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'NFC scan failed');
            setReading(false);
        }
    }, [supported]);

    const stopScan = useCallback(() => {
        setReading(false);
    }, []);

    const simulateNFC = useCallback((data: string) => {
        console.log('Simulating NFC read:', data);
        // In pedagogical mode, simulate NFC tag reading
        try {
            const cardData = JSON.parse(data);
            console.log('Simulated card data:', cardData);
        } catch {
            console.warn('Invalid NFC simulation data');
        }
    }, []);

    return {
        supported,
        reading,
        error,
        startScan,
        stopScan,
        simulateNFC,
    };
}
