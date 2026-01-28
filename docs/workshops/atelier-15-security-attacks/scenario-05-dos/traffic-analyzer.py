#!/usr/bin/env python3
"""
Scénario 5 : Analyseur de Trafic
Détecte les patterns d'attaque DoS

Usage: python traffic-analyzer.py [log_file]
"""

import sys
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# Configuration de détection
CONFIG = {
    'rate_limit_per_source': 100,  # req/s max par source
    'burst_threshold': 500,         # req dans une fenêtre courte
    'burst_window_seconds': 5,
    'latency_threshold_ms': 1000,   # Latence anormale
    'error_rate_threshold': 0.3,    # 30% d'erreurs = problème
    'analysis_window_minutes': 5
}


class TrafficAnalyzer:
    def __init__(self):
        self.requests = []
        self.by_source = defaultdict(list)
        self.by_terminal = defaultdict(list)
        self.alerts = []
    
    def add_request(self, request: dict):
        """Ajoute une requête à l'analyse"""
        self.requests.append(request)
        source = request.get('source_ip', 'unknown')
        terminal = request.get('terminal_id', 'unknown')
        self.by_source[source].append(request)
        self.by_terminal[terminal].append(request)
    
    def detect_rate_violations(self) -> List[dict]:
        """Détecte les dépassements de débit par source"""
        violations = []
        
        for source, requests in self.by_source.items():
            # Grouper par seconde
            by_second = defaultdict(int)
            for req in requests:
                ts = req.get('timestamp', 0)
                second = int(ts)
                by_second[second] += 1
            
            # Vérifier les dépassements
            for second, count in by_second.items():
                if count > CONFIG['rate_limit_per_source']:
                    violations.append({
                        'type': 'RATE_LIMIT_EXCEEDED',
                        'severity': 'HIGH',
                        'source': source,
                        'rate': count,
                        'limit': CONFIG['rate_limit_per_source'],
                        'timestamp': second
                    })
        
        return violations
    
    def detect_bursts(self) -> List[dict]:
        """Détecte les rafales de requêtes"""
        bursts = []
        window = CONFIG['burst_window_seconds']
        threshold = CONFIG['burst_threshold']
        
        if len(self.requests) < threshold:
            return bursts
        
        # Sliding window analysis
        sorted_requests = sorted(self.requests, key=lambda r: r.get('timestamp', 0))
        
        for i in range(len(sorted_requests)):
            start_time = sorted_requests[i].get('timestamp', 0)
            count = 0
            
            for j in range(i, len(sorted_requests)):
                if sorted_requests[j].get('timestamp', 0) - start_time <= window:
                    count += 1
                else:
                    break
            
            if count >= threshold:
                bursts.append({
                    'type': 'BURST_DETECTED',
                    'severity': 'CRITICAL',
                    'count': count,
                    'window_seconds': window,
                    'start_time': start_time
                })
                break  # Un seul burst à signaler
        
        return bursts
    
    def detect_latency_anomalies(self) -> List[dict]:
        """Détecte les latences anormales"""
        anomalies = []
        threshold = CONFIG['latency_threshold_ms']
        
        high_latency = [r for r in self.requests 
                       if r.get('response_time_ms', 0) > threshold]
        
        if len(high_latency) > 0:
            rate = len(high_latency) / len(self.requests) if self.requests else 0
            if rate > 0.1:  # Plus de 10% de requêtes lentes
                anomalies.append({
                    'type': 'HIGH_LATENCY',
                    'severity': 'HIGH',
                    'affected_requests': len(high_latency),
                    'total_requests': len(self.requests),
                    'rate': f"{rate:.1%}",
                    'avg_latency': sum(r.get('response_time_ms', 0) for r in high_latency) / len(high_latency)
                })
        
        return anomalies
    
    def detect_error_spike(self) -> List[dict]:
        """Détecte les pics d'erreurs"""
        spikes = []
        
        errors = [r for r in self.requests if r.get('status', 200) >= 500]
        error_rate = len(errors) / len(self.requests) if self.requests else 0
        
        if error_rate > CONFIG['error_rate_threshold']:
            spikes.append({
                'type': 'ERROR_SPIKE',
                'severity': 'CRITICAL',
                'error_count': len(errors),
                'error_rate': f"{error_rate:.1%}",
                'threshold': f"{CONFIG['error_rate_threshold']:.1%}"
            })
        
        return spikes
    
    def analyze(self) -> dict:
        """Effectue l'analyse complète"""
        self.alerts = []
        
        # Exécuter toutes les détections
        self.alerts.extend(self.detect_rate_violations())
        self.alerts.extend(self.detect_bursts())
        self.alerts.extend(self.detect_latency_anomalies())
        self.alerts.extend(self.detect_error_spike())
        
        # Synthèse
        critical = len([a for a in self.alerts if a['severity'] == 'CRITICAL'])
        high = len([a for a in self.alerts if a['severity'] == 'HIGH'])
        
        status = 'NORMAL'
        if critical > 0:
            status = 'ATTACK_DETECTED'
        elif high > 0:
            status = 'SUSPICIOUS'
        
        return {
            'status': status,
            'total_requests': len(self.requests),
            'unique_sources': len(self.by_source),
            'unique_terminals': len(self.by_terminal),
            'alerts': self.alerts,
            'summary': {
                'critical': critical,
                'high': high,
                'total': len(self.alerts)
            }
        }


def simulate_traffic() -> List[dict]:
    """Simule du trafic incluant une attaque DoS"""
    traffic = []
    base_time = time.time()
    
    # Trafic normal (100 req sur 60s depuis 50 terminaux)
    for i in range(100):
        traffic.append({
            'timestamp': base_time + i * 0.6,
            'source_ip': f"10.0.0.{i % 50 + 1}",
            'terminal_id': f"TERM{i % 50:04d}",
            'response_time_ms': 50 + (i % 30),
            'status': 200
        })
    
    # Attaque DoS (500 req en 5s depuis une seule source)
    attack_start = base_time + 30
    for i in range(500):
        traffic.append({
            'timestamp': attack_start + i * 0.01,
            'source_ip': '192.168.1.100',  # Attaquant
            'terminal_id': 'FAKE0001',
            'response_time_ms': 100 + i * 2,  # Latence croissante
            'status': 200 if i < 300 else 503  # Erreurs sous charge
        })
    
    return traffic


def display_report(analysis: dict):
    """Affiche le rapport d'analyse"""
    print("=" * 60)
    print("  🔍 ANALYSE DE TRAFIC - Scénario 5")
    print("=" * 60)
    
    print(f"\n📊 STATISTIQUES:")
    print(f"   Requêtes analysées: {analysis['total_requests']}")
    print(f"   Sources uniques:    {analysis['unique_sources']}")
    print(f"   Terminaux uniques:  {analysis['unique_terminals']}")
    
    print(f"\n🚨 STATUS: ", end="")
    if analysis['status'] == 'ATTACK_DETECTED':
        print("🔴 ATTAQUE DÉTECTÉE")
    elif analysis['status'] == 'SUSPICIOUS':
        print("🟠 ACTIVITÉ SUSPECTE")
    else:
        print("🟢 NORMAL")
    
    print(f"\n📋 ALERTES ({analysis['summary']['total']}):")
    print(f"   🔴 Critical: {analysis['summary']['critical']}")
    print(f"   🟠 High:     {analysis['summary']['high']}")
    
    if analysis['alerts']:
        print("\n" + "-" * 60)
        print("  DÉTAIL DES ALERTES:")
        print("-" * 60)
        
        for i, alert in enumerate(analysis['alerts'][:5], 1):
            severity_icon = "🔴" if alert['severity'] == 'CRITICAL' else "🟠"
            print(f"\n  {i}. {severity_icon} [{alert['severity']}] {alert['type']}")
            for key, value in alert.items():
                if key not in ['type', 'severity']:
                    print(f"      {key}: {value}")
        
        if len(analysis['alerts']) > 5:
            print(f"\n  ... et {len(analysis['alerts']) - 5} autres alertes")
    
    print("\n" + "=" * 60)
    print("  💡 RECOMMANDATIONS:")
    print("=" * 60)
    
    if analysis['status'] == 'ATTACK_DETECTED':
        print("""
  1. ⚠️  BLOQUER immédiatement la source 192.168.1.100
  2. Activer le circuit breaker
  3. Augmenter les ressources (auto-scale)
  4. Notifier l'équipe sécurité
  5. Collecter les logs pour investigation
""")
    elif analysis['status'] == 'SUSPICIOUS':
        print("""
  1. Surveiller les sources suspectes
  2. Préparer les règles de blocage
  3. Vérifier les seuils de rate limiting
""")
    else:
        print("\n  ✅ Aucune action requise\n")
    
    print("=" * 60)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] != '--simulate':
        # Mode fichier
        with open(sys.argv[1], 'r') as f:
            traffic = [json.loads(line) for line in f]
    else:
        # Mode simulation
        print("🔄 Génération de trafic simulé (incluant attaque DoS)...\n")
        traffic = simulate_traffic()
    
    analyzer = TrafficAnalyzer()
    for req in traffic:
        analyzer.add_request(req)
    
    analysis = analyzer.analyze()
    display_report(analysis)
