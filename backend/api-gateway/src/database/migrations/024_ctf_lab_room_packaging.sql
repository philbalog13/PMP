-- Migration 024: enrich THM-like room packaging metadata for 5 flagship rooms.

-- Template-level packaging metadata
UPDATE learning.ctf_lab_templates
SET manifest = manifest || jsonb_build_object(
    'packagePath', 'labs/rooms/PAY-001',
    'composePath', 'labs/rooms/PAY-001/docker-compose.yml',
    'images', jsonb_build_array('pmp-ctf-pay001-pos', 'pmp-ctf-pay001-bank'),
    'entryCommand', 'lab PAY-001',
    'hybridAccess', true
)
WHERE room_code = 'PAY-001';

UPDATE learning.ctf_lab_templates
SET manifest = manifest || jsonb_build_object(
    'packagePath', 'labs/rooms/PCI-001',
    'composePath', 'labs/rooms/PCI-001/docker-compose.yml',
    'images', jsonb_build_array('pmp-ctf-pci001-web'),
    'entryCommand', 'lab PCI-001',
    'hybridAccess', true
)
WHERE room_code = 'PCI-001';

UPDATE learning.ctf_lab_templates
SET manifest = manifest || jsonb_build_object(
    'packagePath', 'labs/rooms/SOC-001',
    'artifactPath', 'labs/rooms/SOC-001/artifacts',
    'images', jsonb_build_array(),
    'entryCommand', 'lab SOC-001',
    'hybridAccess', false
)
WHERE room_code = 'SOC-001';

UPDATE learning.ctf_lab_templates
SET manifest = manifest || jsonb_build_object(
    'packagePath', 'labs/rooms/API-001',
    'composePath', 'labs/rooms/API-001/docker-compose.yml',
    'images', jsonb_build_array('pmp-ctf-api001'),
    'entryCommand', 'lab API-001',
    'hybridAccess', true
)
WHERE room_code = 'API-001';

UPDATE learning.ctf_lab_templates
SET manifest = manifest || jsonb_build_object(
    'packagePath', 'labs/rooms/DORA-001',
    'composePath', 'labs/rooms/DORA-001/docker-compose.yml',
    'images', jsonb_build_array('pmp-ctf-dora001-frontend', 'pmp-ctf-dora001-backend', 'pmp-ctf-dora001-core'),
    'entryCommand', 'lab DORA-001',
    'hybridAccess', true
)
WHERE room_code = 'DORA-001';

-- Task-level metadata enrichment (task-based THM-like progression)
UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Capture cleartext payment transaction and recover user evidence',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'user'),
    'hints', jsonb_build_array(
        'Use tcpdump or tshark from the attackbox.',
        'Look for non-TLS traffic between pos-terminal and bank-backend.'
    )
)
WHERE task_id = 'PAY-001-T1';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Command injection in POS admin endpoint to obtain root evidence',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'root'),
    'hints', jsonb_build_array(
        'Inspect admin/debug endpoints for unsafe shell execution.',
        'Try controlled command concatenation and read privileged file.'
    )
)
WHERE task_id = 'PAY-001-T2';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Identify SQL injection and map affected PCI controls',
    'validation', jsonb_build_object('mode', 'quiz'),
    'expectedKeywords', jsonb_build_array('sqli', 'input validation', 'pci dss')
)
WHERE task_id = 'PCI-001-T1';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Extract user flag from cardholder dataset and identify key-management weakness',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'user')
)
WHERE task_id = 'PCI-001-T2';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Analyze email headers and suspicious reply-to domains',
    'validation', jsonb_build_object('mode', 'quiz'),
    'artifactRefs', jsonb_build_array(
        'labs/rooms/SOC-001/artifacts/mail-01.eml',
        'labs/rooms/SOC-001/artifacts/mail-02.eml'
    )
)
WHERE task_id = 'SOC-001-T1';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Reconstruct complete fraud chain and submit final analyst conclusion',
    'validation', jsonb_build_object('mode', 'text'),
    'artifactRefs', jsonb_build_array('labs/rooms/SOC-001/artifacts/supplier-invoice.txt')
)
WHERE task_id = 'SOC-001-T2';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Exploit BOLA in transaction history endpoint',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'user')
)
WHERE task_id = 'API-001-T1';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Escalate privileges through vulnerable API diagnostics endpoint',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'root')
)
WHERE task_id = 'API-001-T2';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Compromise initial vulnerable service in DORA simulation',
    'validation', jsonb_build_object('mode', 'flag', 'scope', 'user')
)
WHERE task_id = 'DORA-001-T1';

UPDATE learning.ctf_lab_tasks
SET task_payload = task_payload || jsonb_build_object(
    'titleLong', 'Recover services and validate post-incident recovery report',
    'validation', jsonb_build_object('mode', 'text'),
    'acceptanceChecklist', jsonb_build_array(
        'Impact analysis recorded',
        'Service restoration executed',
        'Post-mortem submitted'
    )
)
WHERE task_id = 'DORA-001-T2';
