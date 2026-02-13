# CTF PMP - Scenarios defensifs complets (20 challenges)

Ce document transforme chaque challenge offensif en scenario Blue Team realiste, avec un workflow de gestion d'incident inspire des pratiques SOC/IR en production.

Cadre cible:
- SOC L1: detection et qualification.
- SOC L2: investigation technique et containment.
- Incident Commander: coordination metier/technique.
- SRE/Platform: changements infra et rollback.
- AppSec: remediations durables et validation.

Cycle de reponse applique a chaque challenge:
1. Detection.
2. Triage.
3. Containment.
4. Eradication.
5. Recovery.
6. Retex et controle de non-regression.

---

## 0) Standard operationnel a appliquer a tous les labs

### Telemetrie minimale
- Logs API Gateway avec `method`, `path`, `status`, `userId`, `role`, `correlationId`, `ip`.
- Logs service par microservice (issuer, switch, HSM, ACS, fraud, POS/acquirer).
- Metriques:
- `rate` par endpoint.
- `error rate`.
- `latence p95/p99`.
- `approval rate` et `decline reason`.
- Evenements DB:
- modifications de donnees sensibles (solde compte, progression CTF, config VulnEngine).

### SLA incident (reference formation)
- MTTD cible: < 5 min sur endpoint critique.
- MTTR cible: < 30 min en mode simulation.
- Restauration service critique: < 15 min.

### Evidences obligatoires
- timeline minute par minute.
- requetes brutes (redacted PAN/CVV).
- hash des artefacts collectes.
- decisions de containment avec horodatage.
- postmortem et backlog de correction.

---

## 1) HSM-001 - Le Coffre Ouvert (exposition endpoint admin)

### Detection
- Alerte sur acces non admin a `GET /hsm/keys`.
- Spike de reponses 200 sur endpoint admin HSM.
- Correlation: source IP nouvelle + enumeration rapide d'URL.

### Triage
- Confirmer role/session de l'appelant.
- Verifier volume et periodes d'acces.
- Evaluer si des cles ont ete consultees/exportees.

### Containment
- Bloquer endpoint via gateway WAF/routing rule.
- Filtrer IP/segment suspect.
- Rotation immediate des cles exposees les plus critiques.

### Eradication
- Ajouter auth forte + RBAC strict sur routes admin HSM.
- Ajouter allowlist reseau inter-service.
- Desactiver route admin en runtime si non necessaire.

### Recovery
- Rejouer tests de non-regression sur `/hsm/status` et operations normales.
- Re-enregistrer inventaire de cles et KCV.

### Retex
- Ajouter controle CI: endpoint admin sans middleware = build KO.
- KPI: temps entre 1er acces suspect et blocage.

---

## 2) HSM-002 - Cles previsibles

### Detection
- Controle quotidien d'entropie des cles de test.
- Regle de conformite: pattern repetitif (ex: `1111...`) interdit.
- Alerte a l'initialisation HSM si cle faible chargee.

### Triage
- Identifier toutes les cles faibles chargees et leurs usages.
- Evaluer impact sur MAC/PIN/chiffrement data.

### Containment
- Marquer cle compromisee `disabled`.
- Bloquer operations de production sur labels de test.

### Eradication
- Regenerer cles via CSPRNG.
- Separation stricte environnements test/prod.
- Politique de complexite et audit automatique.

### Recovery
- Rechiffrer materiaux dependants si necessaire.
- Valider KCV et trajectoires de distribution.

### Retex
- Ajouter gate de deploiement: "weak key detector".

---

## 3) HSM-003 - Fuite dans les logs

### Detection
- Regle DLP sur logs: presence `key`, `clearKey`, `pinBlock`, `PAN`, `cvv`.
- Alerte sur tag `[VULN:LEAK]`.

### Triage
- Determiner fenetre de fuite (debut/fin).
- Lister donnees sensibles journalisees.
- Verifier exposition vers SIEM, stockage long terme, backups.

### Containment
- Desactiver immediatement mode `keyLeakInLogs`.
- Purge d'urgence des index/logs sensibles.
- Restreindre acces aux plateformes de logs.

### Eradication
- Redaction/sanitization centralisee avant emission des logs.
- Tests unitaires "no secrets in logs".
- Politique de retention differenciee pour logs sensibles.

### Recovery
- Rotation credentials/cles potentiellement divulguees.
- Notification interne conformite/risk.

### Retex
- Exercice trimestriel DLP logging.

---

## 4) HSM-004 - ECB leaks patterns

### Detection
- Detection config: mode ECB actif en environnement sensible.
- Analyse statistique de ciphertext: repetition de blocs.

### Triage
- Identifier flux utilisant ECB et donnees concernees.
- Evaluer exploitabilite des patterns.

### Containment
- Bloquer mode ECB via feature flag policy.
- Forcer mode CBC/GCM.

### Eradication
- Migration des appels crypto vers mode auth/chiffrement moderne.
- Validation cryptographique dans pipeline AppSec.

### Recovery
- Rechiffrer donnees sensibles historiques si impact confirme.

### Retex
- Ajouter "crypto baseline" et revue architecture annuelle.

---

## 5) HSM-005 - Timing attack MAC verification

### Detection
- Metrique de distribution latence `verify-mac` par prefixe de payload.
- Alerte sur traffic fort volume, faible payload variance, pattern de brute force.

### Triage
- Verifier si latence depend de la similarite de MAC.
- Identifier acteur, cadence, duree de l'attaque.

### Containment
- Rate-limit agressif endpoint verify.
- Introduire jitter defensif temporaire.

### Eradication
- Comparaison en temps constant.
- Tests de micro-benchmark CI pour detecter side-channel regressions.

### Recovery
- Revalider cle MAC si suspicion de compromission.

### Retex
- Tableau de bord "side-channel hygiene".

---

## 6) REPLAY-001 - Deja Vu (absence anti-rejeu)

### Detection
- Regle SIEM: meme tuple `(pan, amount, stan, arn)` rejoue dans fenetre courte.
- Alertes sur autorisations identiques repetitives.

### Triage
- Distinguer retry legitime vs replay malveillant.
- Evaluer volume de debits dupliques.

### Containment
- Activer anti-replay strict (nonce + TTL + store).
- Bloquer emitter/IP source anormale.

### Eradication
- Introduire idempotency key obligatoire.
- Persister l'etat anti-rejeu en stockage durable.

### Recovery
- Corriger operations dupliquees (reversal/refund).
- Communication support client/merchant.

### Retex
- KPI: taux de duplicates avant/apres correctif.

---

## 7) REPLAY-002 - Velocity memory only

### Detection
- Alerte sur chute brutale de compteurs velocity apres restart.
- Correlation "restart service" puis spike transactionnel.

### Triage
- Confirmer restart volontaire ou force.
- Quantifier transactions passees post-restart.

### Containment
- Geler traffic risque eleve temporairement.
- Activer seuils conservateurs tant que l'etat n'est pas restaure.

### Eradication
- Migrer compteurs velocity en Redis/Postgres persistant.
- Rehydration des compteurs au boot.

### Recovery
- Recalcul historique court terme et reconciliation fraude.

### Retex
- Runbook obligatoire de restart avec verif anti-fraude.

---

## 8) 3DS-001 - OTP universel 123456

### Detection
- Alerte sur concentration anormale d'OTP identique.
- Rule: OTP fixe reussi sur comptes multiples.

### Triage
- Verifier source du generateur OTP.
- Evaluer etendue (toutes transactions challenge?).

### Containment
- Desactiver challenge flow vulnerable.
- Forcer fail-safe: refuser OTP statique detecte.

### Eradication
- OTP CSPRNG + expiration + tentative max.
- Detection brute force et lock adaptatif.

### Recovery
- Revue transactions approuvees avec OTP suspect.
- Compensations fraude si necessaire.

### Retex
- Test de securite OTP a chaque release.

---

## 9) 3DS-002 - Backdoor cardholderName=SUCCESS

### Detection
- Regle input anomaly: valeur magique sur champ non prevu.
- Alerte sur frictionless force sans signal de risque coherent.

### Triage
- Audit code pour backdoor logique.
- Verifier historique d'exploitation.

### Containment
- WAF rule blocage valeur magique.
- Feature flag "strict validation input".

### Eradication
- Retirer condition backdoor.
- Validation schema forte sur tous les champs entrants.

### Recovery
- Rejouer transactions suspectes en simulation.
- Durcir processus review secure code.

### Retex
- Checklist "debug backdoor removal" pre-prod.

---

## 10) 3DS-003 - Bypass juste sous seuil

### Detection
- Alerte sur concentration de montants proches du seuil (ex: 499.99).
- Rule fraud: pattern "sub-threshold burst".

### Triage
- Identifier merchants/clients utilises pour le fractionnement.
- Mesurer pertes potentielles.

### Containment
- Seuil dynamique (pas statique).
- Step-up auth sur pattern suspect.

### Eradication
- Moteur risque combine montant + comportement + device.
- Limites cumulatives par fenetre.

### Recovery
- Reconciliation paiements fractionnes.

### Retex
- KPI: ratio transactions "edge threshold".

---

## 11) FRAUD-001 - Fail open si service fraude down

### Detection
- Alerte quand fallback fraud = approve.
- SLO dependency: indisponibilite fraude > 1 min.

### Triage
- Confirmer nature panne (service, reseau, timeout).
- Evaluer nombre de decisions prises en fallback.

### Containment
- Basculer en fail-closed sur transactions risquees.
- Degrader proprement avec seuils temporaires stricts.

### Eradication
- Politique de decision resiliente (graceful mais securisee).
- Circuit-breaker avec mode "safe deny" selon contexte.

### Recovery
- Re-evaluer transactions approuvees pendant la panne.

### Retex
- Tabletop "fraud dependency outage".

---

## 12) FRAUD-002 - Score gaming juste sous 70

### Detection
- Alerte sur distributions score compactees 66-69.
- Drift detection sur features abusees (MCC, geoloc, velocity).

### Triage
- Verifier attaques d'optimisation score.
- Identifier combinaisons d'attributs suspectes.

### Containment
- Ajouter randomization / secondary checks.
- Bloquer patterns repetitifs.

### Eradication
- Ajuster modele/regles pour penaliser contournement.
- Ajouter signaux comportementaux temporels.

### Recovery
- Reclassification et revue manuelle sur fenetre impactee.

### Retex
- Cadence mensuelle de recalibrage threshold.

---

## 13) ISO-001 - BIN table exposee

### Detection
- Alerte sur acces anonymes a `/transaction/bin-table`.
- Detection d'enumeration topologique.

### Triage
- Evaluer infos topologie divulguees.
- Identifier scans automatises.

### Containment
- Restreindre endpoint debug (auth + ip allowlist).
- Desactiver endpoint en production.

### Eradication
- Separer endpoints debug et runtime.
- Introduire revue "information disclosure".

### Recovery
- Changer artefacts de routage si besoin.

### Retex
- Audit des endpoints "introspection".

---

## 14) ISO-002 - Montant max irrealiste

### Detection
- Alerte sur montants hors profil business.
- Rule: transaction > limite metier autorisee.

### Triage
- Evaluer si acceptance vient de validation technique only.
- Estimer exposition financiere potentielle.

### Containment
- Hard cap metier immediate au gateway + switch.

### Eradication
- Validation multicouche coherence metier.
- Tests de bornes systematiques.

### Recovery
- Bloquer et annuler autorisations anormales.

### Retex
- Ownership clair des limites business.

---

## 15) PIN-001 - HSM down => PIN bypass

### Detection
- Alerte: erreurs HSM suivies de taux approval PIN anormalement haut.
- Correlation timeout HSM + approvals "invalid PIN".

### Triage
- Verifier fallback comportemental actuel.
- Mesurer transactions potentiellement bypass.

### Containment
- Basculer en fail-closed PIN.
- Rate-limit terminal/client le temps du correctif.

### Eradication
- Politique explicite: auth critique ne doit jamais fail-open.
- Tests chaos engineering sur dependance HSM.

### Recovery
- Revue de toutes approvals pendant incident.

### Retex
- Exercice "HSM degradation runbook".

---

## 16) PIN-002 - Math.random pour PIN padding

### Detection
- SAST/secret scan: `Math.random` en contexte crypto.
- Analyse statistique periodicite/predictibilite.

### Triage
- Identifier tous les chemins utilisant PRNG non crypto.
- Evaluer exploitabilite pratique.

### Containment
- Interdire usage PRNG non crypto via lint rule.

### Eradication
- Migrer vers CSPRNG (`crypto.randomBytes`).
- Revue crypto centralisee.

### Recovery
- Rotation materiaux potentiellement exposes.

### Retex
- Politique "approved crypto primitives only".

---

## 17) MITM-001 - CVV en clair dans payload

### Detection
- DLP reseau sur motifs CVV/PAN.
- Alerte sur champs PCI sensibles apres autorisation.

### Triage
- Identifier ou le CVV circule/stagne.
- Evaluer logs/queues/index contenant CVV.

### Containment
- Couper propagation CVV en aval.
- Masquer/redacter champs sensibles immediatement.

### Eradication
- Conformite PCI-DSS: CVV jamais stocke, jamais retransport post-auth.
- Chiffrement mTLS inter-services + schema filtering.

### Recovery
- Purge donnees CVV residuelles.
- Controle compliance post-incident.

### Retex
- Audit PCI automatisable dans pipeline.

---

## 18) PRIV-001 - Balance update sans auth

### Detection
- Alerte sur `PATCH /accounts/*/balance` sans identite admin.
- Rule sur changements de solde hors workflow autorise.

### Triage
- Lister comptes modifies, montant avant/apres, initiateur.
- Correlier avec transactions ulterieures.

### Containment
- Couper endpoint ou exiger auth admin immediate.
- Geler comptes modifies anormalement.

### Eradication
- RBAC + ABAC sur endpoints d'administration.
- Signature de requetes internes sensibles.

### Recovery
- Reconciliation soldes et annulations fraude.

### Retex
- Segregation duties pour operations financieres.

---

## 19) CRYPTO-001 - Token predictible

### Detection
- Entropy monitor sur tokens nouvellement emis.
- Alerte collisions/patterns repetitifs.

### Triage
- Evaluer fenetre de prediction exploitable.
- Identifier data exposee via token guessing.

### Containment
- Rotation cle/token namespace.
- Rate-limit et tarpit sur endpoint token lookup.

### Eradication
- Token generation CSPRNG + longueur suffisante.
- Ajouter signature/verif integrite si necessaire.

### Recovery
- Invalider tokens emis pendant periode risque.

### Retex
- Tests statistiques de randomisation en CI.

---

## 20) CRYPTO-002 - Auth code guessable

### Detection
- Alerte sur tentative repetitive d'auth code.
- Pattern detection sur sequence de codes proches.

### Triage
- Evaluer probabilite de compromission.
- Identifier sessions/comptes cibles.

### Containment
- Expiration auth codes plus courte.
- Lockouts adaptatifs et throttling.

### Eradication
- Generation code via CSPRNG.
- Ajouter facteur contextuel (binding transaction/session).

### Recovery
- Reemettre auth codes pour transactions en cours.

### Retex
- Revue annuelle des mecanismes OTP/auth code.

---

## 21) Plan d'execution pedagogique (mode vie reelle)

### Format session (90 min)
- 15 min: briefing SOC + contexte metier.
- 25 min: detection/triage en temps reel.
- 20 min: containment et decision go/no-go.
- 20 min: eradication + recovery technique.
- 10 min: postmortem et KPI.

### Livrables etudiant
- timeline complete.
- rapport incident 1 page exec + annexe technique.
- plan d'action correctif priorise (P0/P1/P2).

### Scoring defense (100)
- Detection pertinente: 20.
- Qualification correcte: 15.
- Containment proportionne: 20.
- Correctif durable: 25.
- Communication/retour d'experience: 20.

---

## 22) Commandes utiles Blue Team (terminal etudiant defense)

```bash
# Flux API critiques
rg "/api/ctf|/api/transaction|/hsm|/accounts" /var/log/pmp/*.log

# Top endpoints suspects
awk '{print $7}' /var/log/pmp/api-gateway.log | sort | uniq -c | sort -nr | head

# Erreurs par service
rg "ERROR|WARN|VULN|timeout|fallback" /var/log/pmp/* | head -200

# Exemple extraction correlationId
rg "correlationId" /var/log/pmp/api-gateway.log | head -50
```

Ce set permet de reproduire des exercices defensifs proches de la vraie vie: contraintes de temps, impact metier, arbitrage securite/disponibilite, et preuves formelles d'incident response.

---

## 23) Environnement etudiant obligatoire pour tous les labs

- Chaque lab CTF doit etre realise depuis un terminal dedie `AttackBox` dans le reseau PMP (meme logique que TryHackMe).
- URL d'acces: `http://localhost:7681` ou bouton `Ouvrir le terminal` dans `/student/ctf/[code]`.
- Outils disponibles: `curl`, `jq`, `nc`, `nmap`, `tcpdump`, `openssl`, `python3`, `git`, etc.
- Les etudiants utilisent `lab <CODE>` pour obtenir le walkthrough blackbox de leur challenge courant.
- Les cibles internes (`api-gateway`, `hsm-simulator`, `sim-network-switch`, `sim-issuer-service`, etc.) sont resolvables directement depuis l'AttackBox.
