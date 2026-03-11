-- Seed 051: Additional cursus expansion pack
-- Adds 5 new cursus with starter modules and chapters.
-- Idempotent inserts using stable IDs.

-- =============================================================================
-- CURSUS 6: OPEN BANKING
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-6-open-banking',
    'BLOC 6 - Open Banking & API Security',
    'DSP2, consent management, OAuth2/FAPI, mTLS, and API attack resilience for banking integrations.',
    'layers',
    'cyan',
    'AVANCE',
    42,
    ARRAY['open-banking','dsp2','oauth2','fapi','api-security'],
    true,
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-6.1-standards',
    'bloc-6-open-banking',
    'Standards, consent, and trust chain',
    'Understand roles, consent lifecycle, and trust boundaries between TPP, ASPSP, and customer channels.',
    1, 240, '3', 2
),
(
    'mod-6.2-api-defense',
    'bloc-6-open-banking',
    'API hardening and runtime controls',
    'Design defensive controls against BOLA, token theft, and replay on banking APIs.',
    2, 240, '4', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-6.1.1-roles-flow',
    'mod-6.1-standards',
    'Roles and transaction trust flow',
    $$## Trust flow in open banking

The API trust chain is not only technical, it is also legal and operational.

```text
Customer -> TPP App -> API Gateway -> Consent Service -> Core Banking
```

Each hop must validate identity, scope, and freshness of consent.
$$,
    '["Open banking requires both technical and regulatory trust","Each hop validates identity and scope","Consent status must be checked at call time"]'::jsonb,
    1,
    30
),
(
    'ch-6.1.2-consent-lifecycle',
    'mod-6.1-standards',
    'Consent lifecycle and expiry strategy',
    $$## Consent lifecycle

A consent should be treated as a state machine with strict transitions:
- created
- authenticated
- active
- revoked
- expired

Time-boxed consent and explicit revocation limits abuse windows.
$$,
    '["Consent is a state machine, not a static flag","Revocation must be immediate","Expiry windows reduce replay risk"]'::jsonb,
    2,
    30
),
(
    'ch-6.2.1-bola-defense',
    'mod-6.2-api-defense',
    'BOLA prevention by design',
    $$## BOLA resistant API design

Authorization must bind resource owner and token subject on every request.

```text
Token subject -> Policy check -> Resource owner match -> Decision
```

Object IDs in URL are untrusted input until ownership is proven.
$$,
    '["Bind token subject to resource ownership","Never trust path object IDs by default","Reject by default when ownership is unclear"]'::jsonb,
    1,
    35
),
(
    'ch-6.2.2-runtime-controls',
    'mod-6.2-api-defense',
    'Runtime controls: mTLS, JTI, and rate limits',
    $$## Runtime controls

Combine mTLS, short-lived access tokens, JTI replay cache, and endpoint rate limits.

A strong runtime policy blocks token replay and automated probing before business impact.
$$,
    '["mTLS authenticates client channel","JTI cache blocks replay","Rate limits reduce enumeration attempts"]'::jsonb,
    2,
    35
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CURSUS 7: FRAUD ANALYTICS
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-7-fraud-advanced',
    'BLOC 7 - Advanced Fraud Analytics',
    'Risk feature engineering, explainable scoring, model drift, and fraud operations playbooks.',
    'shield',
    'amber',
    'EXPERT',
    48,
    ARRAY['fraud','risk-scoring','ml','drift','xai'],
    true,
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-7.1-feature-risk',
    'bloc-7-fraud-advanced',
    'Feature engineering for payment risk',
    'Build strong risk signals from transaction, device, and behavior telemetry.',
    1, 300, '4', 2
),
(
    'mod-7.2-mlops-fraud',
    'bloc-7-fraud-advanced',
    'MLOps and model governance',
    'Monitor model drift, manage thresholds, and keep decisions explainable to operations.',
    2, 300, '5', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-7.1.1-signal-families',
    'mod-7.1-feature-risk',
    'Signal families and enrichment strategy',
    $$## Risk signal families

Good fraud systems blend multiple signal groups:
- transaction context
- identity confidence
- device posture
- behavioral anomalies

```text
Event -> Feature service -> Risk engine -> Decision queue
```
$$,
    '["Blend heterogeneous signals for stronger detection","Real-time enrichment improves precision","Single-signal models are fragile"]'::jsonb,
    1,
    35
),
(
    'ch-7.1.2-threshold-design',
    'mod-7.1-feature-risk',
    'Threshold and intervention design',
    $$## Threshold strategy

Use tiered thresholds:
- allow
- challenge
- review
- block

Thresholds must be calibrated by loss appetite and customer friction budget.
$$,
    '["Use multi-zone thresholds instead of binary cutoffs","Tune for both loss and friction","Review queues absorb uncertain cases"]'::jsonb,
    2,
    35
),
(
    'ch-7.2.1-drift-observability',
    'mod-7.2-mlops-fraud',
    'Drift detection and observability',
    $$## Drift observability

Monitor feature drift, label delay, and alert quality over time.

```text
Live traffic -> Feature stats -> Drift monitor -> Retrain trigger
```

Without drift monitoring, model quality decays silently.
$$,
    '["Feature drift can silently degrade performance","Observability must include business metrics","Automated retrain triggers need guardrails"]'::jsonb,
    1,
    40
),
(
    'ch-7.2.2-explainability-ops',
    'mod-7.2-mlops-fraud',
    'Explainability for fraud operations',
    $$## Explainability in operations

Analysts need actionable explanations, not raw model scores.
Design reason codes that map to specific controls and remediation steps.
$$,
    '["Reason codes reduce analyst triage time","Explainability supports auditability","Operational playbooks must map to model outputs"]'::jsonb,
    2,
    40
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CURSUS 8: CLOUD DEVSECOPS
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-8-cloud-devsecops',
    'BLOC 8 - Cloud DevSecOps for Payments',
    'Secure cloud platform engineering for payment systems with policy-as-code and supply chain controls.',
    'lock',
    'violet',
    'AVANCE',
    44,
    ARRAY['cloud','devsecops','kubernetes','supply-chain','policy-as-code'],
    true,
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-8.1-zero-trust-cloud',
    'bloc-8-cloud-devsecops',
    'Zero trust platform architecture',
    'Apply workload identity, segmentation, and secrets governance in cloud-native payment services.',
    1, 270, '4', 2
),
(
    'mod-8.2-ci-cd-security',
    'bloc-8-cloud-devsecops',
    'Secure CI/CD and software supply chain',
    'Protect build systems with provenance, artifact signing, and deployment policy checks.',
    2, 270, '4', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-8.1.1-workload-identity',
    'mod-8.1-zero-trust-cloud',
    'Workload identity and service boundaries',
    $$## Identity-first architecture

Machine identity is the root of trust in service-to-service traffic.

```text
Service A -> Identity provider -> Short token -> Service B
```

Static shared secrets should be replaced by short-lived credentials.
$$,
    '["Workload identity is foundational in zero trust","Short-lived credentials reduce blast radius","Service boundaries must be explicit"]'::jsonb,
    1,
    35
),
(
    'ch-8.1.2-secrets-governance',
    'mod-8.1-zero-trust-cloud',
    'Secrets governance and rotation',
    $$## Secrets governance

Define owners, rotation windows, and emergency revocation procedures.
Use audit trails to prove who accessed which secret and when.
$$,
    '["Secret ownership must be explicit","Rotation and revocation are mandatory controls","Auditability is required for regulated systems"]'::jsonb,
    2,
    35
),
(
    'ch-8.2.1-supply-chain-controls',
    'mod-8.2-ci-cd-security',
    'Supply chain controls and provenance',
    $$## Secure build pipeline

```text
Source -> Build runner -> Signed artifact -> Policy gate -> Runtime
```

Every artifact should be traceable to a trusted build context and immutable source.
$$,
    '["Provenance links artifacts to trusted builds","Artifact signing reduces tampering risk","Policy gates enforce release hygiene"]'::jsonb,
    1,
    35
),
(
    'ch-8.2.2-deployment-policy',
    'mod-8.2-ci-cd-security',
    'Deployment policy and release guardrails',
    $$## Release guardrails

Promotions to production should require security posture checks, change approvals, and rollback readiness.
Automated policy checks prevent non-compliant deploys from reaching runtime.
$$,
    '["Policy-as-code enforces release discipline","Rollback readiness is a security control","Production promotions need explicit approvals"]'::jsonb,
    2,
    35
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CURSUS 9: INCIDENT RESPONSE
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-9-incident-response',
    'BLOC 9 - Incident Response & Forensics',
    'Detection, triage, containment, forensics, and post-incident hardening for payment environments.',
    'file-text',
    'rose',
    'EXPERT',
    46,
    ARRAY['incident-response','soc','forensics','pci','postmortem'],
    true,
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-9.1-detection-response',
    'bloc-9-incident-response',
    'Detection and containment playbooks',
    'Standardize triage and containment decisions for fraud and infrastructure incidents.',
    1, 270, '4', 2
),
(
    'mod-9.2-forensics-pci',
    'bloc-9-incident-response',
    'Forensics and evidence for regulated systems',
    'Collect, preserve, and report evidence aligned with PCI and legal requirements.',
    2, 270, '5', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-9.1.1-triage-model',
    'mod-9.1-detection-response',
    'Severity model and triage routing',
    $$## Triage routing model

```text
Alert -> Triage -> Severity decision -> Containment owner
```

Fast triage quality is the key variable for reducing incident impact.
$$,
    '["Triage speed drives impact reduction","Severity must map to ownership","Routing rules should be explicit and testable"]'::jsonb,
    1,
    35
),
(
    'ch-9.1.2-containment-patterns',
    'mod-9.1-detection-response',
    'Containment patterns for payment systems',
    $$## Containment patterns

Containment can target accounts, cards, API keys, workloads, or network paths.
Choose reversible controls first when uncertainty is high.
$$,
    '["Containment scope should match evidence confidence","Prefer reversible controls under uncertainty","Control latency is an operational KPI"]'::jsonb,
    2,
    35
),
(
    'ch-9.2.1-evidence-chain',
    'mod-9.2-forensics-pci',
    'Evidence chain and timeline reconstruction',
    $$## Evidence chain

```text
Collection -> Integrity hash -> Secure storage -> Analysis -> Report
```

Evidence integrity must be provable from capture to reporting.
$$,
    '["Evidence integrity needs cryptographic checks","Timeline reconstruction links actions to impact","Secure evidence storage is mandatory"]'::jsonb,
    1,
    40
),
(
    'ch-9.2.2-post-incident-hardening',
    'mod-9.2-forensics-pci',
    'Post-incident hardening and verification',
    $$## Hardening loop

Post-incident actions are not complete until controls are validated in production-like tests.
Convert findings into measurable control objectives and tracking metrics.
$$,
    '["Hardening must be verified, not assumed","Findings should map to measurable controls","Close the loop with follow-up simulations"]'::jsonb,
    2,
    40
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CURSUS 10: REGTECH & COMPLIANCE
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-10-regtech-compliance',
    'BLOC 10 - International Compliance & RegTech',
    'Cross-border regulation mapping, control evidence engineering, and continuous compliance operations.',
    'book-open',
    'emerald',
    'AVANCE',
    40,
    ARRAY['compliance','regtech','pci-dss','dora','reporting'],
    true,
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES
(
    'mod-10.1-regulation-framework',
    'bloc-10-regtech-compliance',
    'Regulation mapping and control taxonomy',
    'Map obligations from multiple frameworks into one consistent control model.',
    1, 240, '3', 2
),
(
    'mod-10.2-audit-evidence',
    'bloc-10-regtech-compliance',
    'Audit evidence automation',
    'Automate evidence collection and quality checks for recurring audits and certifications.',
    2, 240, '4', 2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES
(
    'ch-10.1.1-framework-mapping',
    'mod-10.1-regulation-framework',
    'Framework mapping strategy',
    $$## Unified control taxonomy

```text
Requirement source -> Control objective -> Evidence source -> Audit report
```

A single taxonomy prevents duplicate controls and conflicting interpretations.
$$,
    '["Use a shared control taxonomy across frameworks","Map each requirement to evidence sources","Avoid duplicate controls by design"]'::jsonb,
    1,
    30
),
(
    'ch-10.1.2-gap-prioritization',
    'mod-10.1-regulation-framework',
    'Gap prioritization and remediation planning',
    $$## Gap prioritization

Prioritize by regulatory impact, exploitability, and remediation lead time.
Use staged plans to reduce high-risk exposure first.
$$,
    '["Prioritize by impact and exploitability","Account for remediation lead time","Stage remediation for rapid risk reduction"]'::jsonb,
    2,
    30
),
(
    'ch-10.2.1-evidence-pipeline',
    'mod-10.2-audit-evidence',
    'Evidence pipeline architecture',
    $$## Evidence pipeline

```text
Control check -> Evidence collector -> Integrity store -> Review dashboard
```

Automated evidence pipelines reduce manual audit overhead and improve consistency.
$$,
    '["Automated evidence improves consistency","Integrity storage protects audit trust","Dashboards improve reviewer throughput"]'::jsonb,
    1,
    35
),
(
    'ch-10.2.2-continuous-compliance',
    'mod-10.2-audit-evidence',
    'Continuous compliance operations',
    $$## Continuous compliance

Compliance should run as a continuous operational loop with daily controls, drift alerts, and periodic attestations.
$$,
    '["Continuous checks detect drift earlier","Alerts should map to accountable owners","Attestations close the governance loop"]'::jsonb,
    2,
    35
) ON CONFLICT (id) DO NOTHING;

