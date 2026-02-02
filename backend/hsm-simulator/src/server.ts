import app from './app';
import dotenv from 'dotenv';
import { KeyStore } from './services/KeyStore';

dotenv.config();

const PORT = process.env.HSM_PORT || 8011;

// Initialize KeyStore
KeyStore.initialize();

app.listen(PORT, () => {
    console.log(`🔒 HSM Simulator running on port ${PORT}`);
    console.log(`🔑 Master Keys Loaded`);
});
