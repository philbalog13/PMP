# THM-like Room Packaging

This folder contains task-based room packages aligned with the PMP THM-like model.

Rooms:
- PAY-001
- PCI-001
- SOC-001
- API-001
- DORA-001

Conventions:
- `manifest.json`: pedagogical + orchestration metadata.
- `docker-compose.yml`: local standalone launch for room validation.
- Machine-backed rooms provide minimal vulnerable services for controlled labs.
- Flags are validated by PMP platform. Local files in these images are for lab realism only.

Build all room images:
- PowerShell: `./labs/rooms/scripts/build-images.ps1`
- Bash: `bash ./labs/rooms/scripts/build-images.sh`

Smoke launch examples:
- `docker compose -f labs/rooms/PAY-001/docker-compose.yml up --build`
- `docker compose -f labs/rooms/API-001/docker-compose.yml up --build`
