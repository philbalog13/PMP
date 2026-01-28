#!/usr/bin/env python3
"""
Scénario 2 : PAN Harvesting Attack
EXPLOIT : Extraction de PAN depuis des logs non sécurisés

⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT

Usage: python pan-extractor.py [log_file]
"""

import re
import sys
import os
from datetime import datetime
from typing import List, Dict, Tuple

# Patterns pour détecter les PAN
PAN_PATTERNS = [
    # Visa (13-16 chiffres commençant par 4)
    r'\b4[0-9]{12}(?:[0-9]{3})?\b',
    # Mastercard (16 chiffres commençant par 51-55 ou 2221-2720)
    r'\b5[1-5][0-9]{14}\b',
    r'\b2(?:2[2-9][1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[01][0-9]|720)[0-9]{12}\b',
    # American Express (15 chiffres commençant par 34 ou 37)
    r'\b3[47][0-9]{13}\b',
    # Discover (16 chiffres)
    r'\b6(?:011|5[0-9]{2})[0-9]{12}\b',
]

# Patterns additionnels dans les logs
LOG_PATTERNS = [
    r'PAN[:\s=]+([0-9]{13,19})',
    r'card[_\-]?number[:\s=]+([0-9]{13,19})',
    r'cardNumber[:\s=]+([0-9]{13,19})',
    r'"pan"[:\s]*"([0-9]{13,19})"',
    r'DE2[:\s=]+([0-9]{13,19})',
]


def luhn_check(card_number: str) -> bool:
    """Vérifie si un numéro de carte passe le test de Luhn"""
    def digits_of(n):
        return [int(d) for d in str(n)]
    
    digits = digits_of(card_number)
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    
    checksum = sum(odd_digits)
    for d in even_digits:
        checksum += sum(digits_of(d * 2))
    
    return checksum % 10 == 0


def identify_card_brand(pan: str) -> str:
    """Identifie la marque de la carte"""
    if pan.startswith('4'):
        return 'Visa'
    elif pan.startswith(('51', '52', '53', '54', '55')):
        return 'Mastercard'
    elif pan.startswith(('34', '37')):
        return 'Amex'
    elif pan.startswith('6011') or pan.startswith('65'):
        return 'Discover'
    else:
        return 'Unknown'


def extract_pans_from_content(content: str) -> List[Dict]:
    """Extrait tous les PAN d'un contenu texte"""
    found_pans = []
    seen = set()
    
    # Chercher avec les patterns de log structurés
    for pattern in LOG_PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            pan = match.group(1)
            if pan not in seen and luhn_check(pan):
                seen.add(pan)
                found_pans.append({
                    'pan': pan,
                    'brand': identify_card_brand(pan),
                    'context': content[max(0, match.start()-50):match.end()+50],
                    'source': 'structured_log'
                })
    
    # Chercher les patterns bruts de PAN
    for pattern in PAN_PATTERNS:
        matches = re.finditer(pattern, content)
        for match in matches:
            pan = match.group()
            if pan not in seen and luhn_check(pan):
                seen.add(pan)
                found_pans.append({
                    'pan': pan,
                    'brand': identify_card_brand(pan),
                    'context': content[max(0, match.start()-50):match.end()+50],
                    'source': 'raw_pattern'
                })
    
    return found_pans


def scan_file(filepath: str) -> List[Dict]:
    """Scanne un fichier pour trouver des PAN"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        pans = extract_pans_from_content(content)
        for pan in pans:
            pan['file'] = filepath
        return pans
    except Exception as e:
        print(f"Erreur lecture {filepath}: {e}")
        return []


def scan_directory(dirpath: str) -> List[Dict]:
    """Scanne un répertoire récursivement"""
    all_pans = []
    log_extensions = ['.log', '.txt', '.json', '.xml', '.csv']
    
    for root, dirs, files in os.walk(dirpath):
        for file in files:
            if any(file.endswith(ext) for ext in log_extensions):
                filepath = os.path.join(root, file)
                pans = scan_file(filepath)
                all_pans.extend(pans)
    
    return all_pans


def generate_report(pans: List[Dict]):
    """Génère un rapport d'exploitation"""
    print("=" * 60)
    print("  💀 RAPPORT D'EXTRACTION PAN - Scénario 2")
    print("  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE")
    print("=" * 60)
    
    print(f"\n📊 STATISTIQUES:")
    print(f"   Total PAN extraits: {len(pans)}")
    
    # Stats par marque
    brands = {}
    for pan in pans:
        brand = pan['brand']
        brands[brand] = brands.get(brand, 0) + 1
    
    print("\n   Par marque:")
    for brand, count in sorted(brands.items(), key=lambda x: -x[1]):
        print(f"     {brand}: {count}")
    
    # Afficher les PAN trouvés (masqués)
    print("\n" + "-" * 60)
    print("  PAN EXTRAITS (masqués pour sécurité)")
    print("-" * 60)
    
    for i, pan_info in enumerate(pans[:10], 1):
        masked = pan_info['pan'][:6] + '****' + pan_info['pan'][-4:]
        print(f"\n  {i}. {masked}")
        print(f"     Marque: {pan_info['brand']}")
        print(f"     Source: {pan_info.get('file', 'stdin')}")
        print(f"     Contexte: ...{pan_info['context'][:60]}...")
    
    if len(pans) > 10:
        print(f"\n  ... et {len(pans) - 10} autres PAN")
    
    print("\n" + "=" * 60)
    print("  ⚠️  CETTE VULNÉRABILITÉ EST CRITIQUE")
    print("=" * 60)
    print("""
  IMPACT:
  - Violation PCI-DSS Exigence 3.4
  - Vol massif de données sensibles
  - Responsabilité légale

  SOLUTION:
  - Masking systématique des PAN
  - Chiffrement des logs
  - Contrôle d'accès strict
  """)


def simulate_attack():
    """Simule une attaque avec des logs factices"""
    fake_logs = """
2026-01-28 14:30:22 INFO [TransactionProcessor] Processing payment
  PAN: 4111111111111111
  Amount: 125.00 EUR
  Terminal: TERM0001
  
2026-01-28 14:31:45 DEBUG [AuthEngine] Authorization request
  {"pan": "5500000000000004", "amount": 8999, "mcc": "5411"}
  
2026-01-28 14:32:10 INFO [NetworkSwitch] Message DE2=340000000000009
  Processing code: 000000
  
2026-01-28 14:33:55 ERROR [FraudDetection] Suspicious transaction
  cardNumber=6011000000000004
  velocity_check: FAILED
  
2026-01-28 14:35:01 INFO Transaction completed for card 4532015112830366
"""
    
    print("═" * 60)
    print("  🔴 SIMULATION D'ATTAQUE PAN HARVESTING")
    print("═" * 60)
    print("\n📄 Contenu du log vulnérable:\n")
    print(fake_logs)
    
    pans = extract_pans_from_content(fake_logs)
    generate_report(pans)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if os.path.isfile(target):
            pans = scan_file(target)
        elif os.path.isdir(target):
            pans = scan_directory(target)
        else:
            print(f"Erreur: {target} n'existe pas")
            sys.exit(1)
        generate_report(pans)
    else:
        # Mode simulation
        simulate_attack()
