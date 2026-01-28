#!/bin/bash

# ==============================================
# Load Pedagogical Test Keys Script
# Plateforme Monétique Pédagogique (PMP)
# ==============================================

set -e

echo "=========================================="
echo "  PMP Cryptographic Test Keys Loader"
echo "=========================================="

# Create keys directory if it doesn't exist
KEYS_DIR="./keys"
mkdir -p "$KEYS_DIR"

echo "Keys directory: $KEYS_DIR"

# ==============================================
# Generate Self-Signed SSL Certificates (Nginx)
# ==============================================

echo ""
echo "Generating self-signed SSL certificates for Nginx..."

SSL_DIR="./nginx/ssl"
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/key.pem" 2048 2>/dev/null

# Generate self-signed certificate (valid for 365 days)
openssl req -new -x509 -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days 365 \
    -subj "/C=FR/ST=IDF/L=Paris/O=PMP Pedagogical/OU=IT Department/CN=pmp.local" \
    2>/dev/null

echo "✓ SSL certificates generated:"
echo "  - Certificate: $SSL_DIR/cert.pem"
echo "  - Private Key: $SSL_DIR/key.pem"

# ==============================================
# Generate LMK (Local Master Key) for HSM
# ==============================================

echo ""
echo "Generating Local Master Key (LMK) for HSM Simulator..."

# Generate 256-bit random key (32 bytes = 64 hex characters)
LMK_KEY=$(openssl rand -hex 32)

# Save to file
echo "$LMK_KEY" > "$KEYS_DIR/lmk.key"
chmod 600 "$KEYS_DIR/lmk.key"

echo "✓ LMK generated: $KEYS_DIR/lmk.key"

# ==============================================
# Generate Master Encryption Key
# ==============================================

echo ""
echo "Generating Master Encryption Key for Key Management..."

# Generate 256-bit master key
MASTER_KEY=$(openssl rand -hex 32)

# Save to file
echo "$MASTER_KEY" > "$KEYS_DIR/master.key"
chmod 600 "$KEYS_DIR/master.key"

echo "✓ Master Key generated: $KEYS_DIR/master.key"

# ==============================================
# Generate PIN Encryption Key (3DES)
# ==============================================

echo ""
echo "Generating PIN Encryption Key (3DES)..."

# Generate 192-bit key for 3DES (24 bytes = 48 hex characters)
PIN_ENC_KEY=$(openssl rand -hex 24)

# Save to file
echo "$PIN_ENC_KEY" > "$KEYS_DIR/pin_encryption.key"
chmod 600 "$KEYS_DIR/pin_encryption.key"

echo "✓ PIN Encryption Key generated: $KEYS_DIR/pin_encryption.key"

# ==============================================
# Generate MAC Key (HMAC-SHA256)
# ==============================================

echo ""
echo "Generating MAC Key (HMAC-SHA256)..."

# Generate 256-bit key for MAC
MAC_KEY=$(openssl rand -hex 32)

# Save to file
echo "$MAC_KEY" > "$KEYS_DIR/mac.key"
chmod 600 "$KEYS_DIR/mac.key"

echo "✓ MAC Key generated: $KEYS_DIR/mac.key"

# ==============================================
# Generate CVV Key (3DES)
# ==============================================

echo ""
echo "Generating CVV Generation Key (3DES)..."

# Generate 192-bit key for CVV
CVV_KEY=$(openssl rand -hex 24)

# Save to file
echo "$CVV_KEY" > "$KEYS_DIR/cvv.key"
chmod 600 "$KEYS_DIR/cvv.key"

echo "✓ CVV Key generated: $KEYS_DIR/cvv.key"

# ==============================================
# Generate Data Encryption Key (AES-256)
# ==============================================

echo ""
echo "Generating Data Encryption Key (AES-256)..."

# Generate 256-bit key for data encryption
DATA_ENC_KEY=$(openssl rand -hex 32)

# Save to file
echo "$DATA_ENC_KEY" > "$KEYS_DIR/data_encryption.key"
chmod 600 "$KEYS_DIR/data_encryption.key"

echo "✓ Data Encryption Key generated: $KEYS_DIR/data_encryption.key"

# ==============================================
# Generate RSA Key Pair for Signatures
# ==============================================

echo ""
echo "Generating RSA key pair for digital signatures..."

# Generate private key
openssl genrsa -out "$KEYS_DIR/rsa_private.pem" 2048 2>/dev/null

# Generate public key
openssl rsa -in "$KEYS_DIR/rsa_private.pem" -pubout -out "$KEYS_DIR/rsa_public.pem" 2>/dev/null

chmod 600 "$KEYS_DIR/rsa_private.pem"
chmod 644 "$KEYS_DIR/rsa_public.pem"

echo "✓ RSA keys generated:"
echo "  - Private: $KEYS_DIR/rsa_private.pem"
echo "  - Public: $KEYS_DIR/rsa_public.pem"

# ==============================================
# Create Key Registry File
# ==============================================

echo ""
echo "Creating key registry file..."

cat > "$KEYS_DIR/key_registry.json" <<EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "keys": {
    "lmk": {
      "file": "lmk.key",
      "type": "LMK",
      "algorithm": "AES-256",
      "usage": "HSM Local Master Key",
      "length_bits": 256
    },
    "master": {
      "file": "master.key",
      "type": "KEK",
      "algorithm": "AES-256",
      "usage": "Master Encryption Key for KEK",
      "length_bits": 256
    },
    "pin_encryption": {
      "file": "pin_encryption.key",
      "type": "PIN_ENC",
      "algorithm": "3DES",
      "usage": "PIN Block Encryption",
      "length_bits": 192
    },
    "mac": {
      "file": "mac.key",
      "type": "MAC",
      "algorithm": "HMAC-SHA256",
      "usage": "Message Authentication Code",
      "length_bits": 256
    },
    "cvv": {
      "file": "cvv.key",
      "type": "CVV_KEY",
      "algorithm": "3DES",
      "usage": "CVV/CVV2 Generation",
      "length_bits": 192
    },
    "data_encryption": {
      "file": "data_encryption.key",
      "type": "DATA_ENC",
      "algorithm": "AES-256",
      "usage": "General Data Encryption",
      "length_bits": 256
    },
    "rsa_signature": {
      "private_file": "rsa_private.pem",
      "public_file": "rsa_public.pem",
      "type": "SIGNATURE",
      "algorithm": "RSA-2048",
      "usage": "Digital Signatures",
      "length_bits": 2048
    }
  },
  "ssl": {
    "certificate": "../nginx/ssl/cert.pem",
    "private_key": "../nginx/ssl/key.pem",
    "type": "SSL/TLS",
    "algorithm": "RSA-2048",
    "validity_days": 365,
    "usage": "Nginx HTTPS"
  },
  "notes": [
    "⚠️  These keys are for PEDAGOGICAL purposes ONLY",
    "⚠️  DO NOT use in production environments",
    "⚠️  Keys are stored unencrypted for educational clarity",
    "✓  In production, use HSM and proper key management"
  ]
}
EOF

chmod 644 "$KEYS_DIR/key_registry.json"

echo "✓ Key registry created: $KEYS_DIR/key_registry.json"

# ==============================================
# Create .gitignore for keys directory
# ==============================================

cat > "$KEYS_DIR/.gitignore" <<EOF
# Ignore all key files (security)
*.key
*.pem
*.crt

# Except the registry
!key_registry.json
!.gitignore

# Nginx SSL
../nginx/ssl/*.pem
../nginx/ssl/*.key
EOF

echo "✓ .gitignore created for keys directory"

# ==============================================
# Set Permissions
# ==============================================

echo ""
echo "Setting secure permissions..."

chmod 700 "$KEYS_DIR"
chmod 700 "$SSL_DIR"

echo "✓ Permissions set (700 for directories, 600 for keys)"

# ==============================================
# Summary
# ==============================================

echo ""
echo "=========================================="
echo "  ✓ All cryptographic keys generated!"
echo "=========================================="
echo ""
echo "Generated keys:"
echo "  1. LMK (Local Master Key) - AES-256"
echo "  2. Master Key (KEK) - AES-256"
echo "  3. PIN Encryption Key - 3DES"
echo "  4. MAC Key - HMAC-SHA256"
echo "  5. CVV Key - 3DES"
echo "  6. Data Encryption Key - AES-256"
echo "  7. RSA Key Pair - RSA-2048"
echo "  8. SSL Certificate - RSA-2048"
echo ""
echo "Key registry: $KEYS_DIR/key_registry.json"
echo ""
echo "⚠️  SECURITY NOTICE:"
echo "  These keys are for PEDAGOGICAL use only!"
echo "  DO NOT use in production environments!"
echo ""
echo "=========================================="

# ==============================================
# Display Key Fingerprints
# ==============================================

echo ""
echo "Key fingerprints (for verification):"
echo "-------------------------------------"
echo -n "LMK:        "
head -c 16 "$KEYS_DIR/lmk.key"
echo "..."
echo -n "Master Key: "
head -c 16 "$KEYS_DIR/master.key"
echo "..."
echo -n "SSL Cert:   "
openssl x509 -in "$SSL_DIR/cert.pem" -noout -fingerprint -sha256 2>/dev/null | cut -d'=' -f2
echo ""

echo "Ready for Docker deployment!"
echo "=========================================="
