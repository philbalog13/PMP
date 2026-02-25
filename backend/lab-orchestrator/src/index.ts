import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const app = express();

const PORT = Number(process.env.PORT || 8098);
const ORCHESTRATOR_SECRET = process.env.LAB_ORCHESTRATOR_SECRET || '';
const DOCKER_PROXY_URL = process.env.DOCKER_PROXY_URL || 'http://docker-socket-proxy:2375';
const LAB_ACCESS_PROXY_BASE_PATH = process.env.LAB_ACCESS_PROXY_BASE_PATH || '/lab';
const LAB_ATTACKBOX_CONTAINER_NAME = process.env.LAB_ATTACKBOX_CONTAINER_NAME || 'pmp-ctf-attackbox';
const LAB_ATTACKBOX_CONTAINER_IMAGE = process.env.LAB_ATTACKBOX_CONTAINER_IMAGE || 'pmp-ctf-attackbox';
const LAB_ENABLE_DOCKER_ACTIONS = String(process.env.LAB_ENABLE_DOCKER_ACTIONS || 'false').toLowerCase() === 'true';

app.use(express.json({ limit: '2mb' }));

function requireSecret(req: Request, res: Response, next: NextFunction): void {
    const provided = String(req.headers['x-orchestrator-secret'] || '');
    if (!ORCHESTRATOR_SECRET || provided !== ORCHESTRATOR_SECRET) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    next();
}

/* ------------------------------------------------------------------ */
/*  Docker API helpers                                                 */
/* ------------------------------------------------------------------ */

async function dockerPost(path: string, body: Record<string, any>): Promise<any> {
    const response = await axios.post(`${DOCKER_PROXY_URL}${path}`, body, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
}

async function dockerPostEmpty(path: string): Promise<any> {
    const response = await axios.post(`${DOCKER_PROXY_URL}${path}`, null, {
        timeout: 15000,
        validateStatus: (s) => s < 400 || s === 304,
    });
    return response.data;
}

async function dockerGet(path: string): Promise<any> {
    const response = await axios.get(`${DOCKER_PROXY_URL}${path}`, { timeout: 10000 });
    return response.data;
}

async function dockerDelete(path: string): Promise<void> {
    await axios.delete(`${DOCKER_PROXY_URL}${path}`, {
        timeout: 15000,
        validateStatus: (s) => s < 400 || s === 404,
    });
}

/* ------------------------------------------------------------------ */
/*  Network helpers                                                    */
/* ------------------------------------------------------------------ */

async function ensureNetwork(networkName: string, cidrBlock: string): Promise<void> {
    if (!LAB_ENABLE_DOCKER_ACTIONS) return;

    try {
        await dockerPost('/networks/create', {
            Name: networkName,
            Driver: 'bridge',
            Labels: { 'pmp.lab.orchestrator': 'true' },
            IPAM: { Config: [{ Subnet: cidrBlock }] },
        });
    } catch (error: any) {
        const message = String(error?.response?.data?.message || error?.message || '');
        if (!message.includes('already exists')) {
            throw error;
        }
    }
}

async function connectToNetwork(networkName: string, containerName: string, ipAddress?: string): Promise<void> {
    if (!LAB_ENABLE_DOCKER_ACTIONS) return;

    const body: Record<string, any> = { Container: containerName };
    if (ipAddress) {
        body.EndpointConfig = { IPAMConfig: { IPv4Address: ipAddress } };
    }

    try {
        await dockerPost(`/networks/${encodeURIComponent(networkName)}/connect`, body);
    } catch (error: any) {
        const msg = String(error?.response?.data?.message || error?.message || '');
        if (msg.includes('already exists') || msg.includes('endpoint with name')) return;
        throw error;
    }
}

async function disconnectFromNetwork(networkName: string, containerName: string): Promise<void> {
    if (!LAB_ENABLE_DOCKER_ACTIONS) return;

    try {
        await dockerPost(`/networks/${encodeURIComponent(networkName)}/disconnect`, {
            Container: containerName,
            Force: true,
        });
    } catch (error: any) {
        const msg = String(error?.response?.data?.message || error?.message || '');
        if (msg.includes('not found') || msg.includes('is not connected')) return;
        console.warn(`[orchestrator] disconnect ${containerName} from ${networkName} failed: ${msg}`);
    }
}

/* ------------------------------------------------------------------ */
/*  Container lifecycle                                                */
/* ------------------------------------------------------------------ */

interface ContainerCreateResult {
    containerId: string;
    containerName: string;
}

async function createAndStartContainer(opts: {
    name: string;
    image: string;
    networkName: string;
    ipAddress: string;
    sessionCode: string;
    env?: string[];
}): Promise<ContainerCreateResult> {
    const containerName = opts.name;

    const createBody: Record<string, any> = {
        Image: opts.image,
        Labels: {
            'pmp.lab.orchestrator': 'true',
            'pmp.lab.session': opts.sessionCode,
        },
        Env: opts.env || [],
        HostConfig: {
            NetworkMode: opts.networkName,
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [opts.networkName]: {
                    IPAMConfig: { IPv4Address: opts.ipAddress },
                },
            },
        },
    };

    const created = await dockerPost(
        `/containers/create?name=${encodeURIComponent(containerName)}`,
        createBody
    );
    const containerId = String(created?.Id || '');

    await dockerPostEmpty(`/containers/${containerId}/start`);

    console.log(`[orchestrator] started container ${containerName} (${containerId.slice(0, 12)}) at ${opts.ipAddress}`);
    return { containerId, containerName };
}

async function stopAndRemoveContainer(containerId: string): Promise<void> {
    try {
        await dockerPostEmpty(`/containers/${containerId}/stop?t=3`);
    } catch { /* ignore */ }
    try {
        await dockerDelete(`/containers/${containerId}?force=true`);
    } catch { /* ignore */ }
}

async function listSessionContainers(sessionCode: string): Promise<Array<{ Id: string; Names: string[] }>> {
    if (!LAB_ENABLE_DOCKER_ACTIONS) return [];

    const filters = JSON.stringify({ label: [`pmp.lab.session=${sessionCode}`] });
    const containers = await dockerGet(`/containers/json?all=true&filters=${encodeURIComponent(filters)}`);
    return Array.isArray(containers) ? containers : [];
}

/* ------------------------------------------------------------------ */
/*  IP address computation                                             */
/* ------------------------------------------------------------------ */

function computeTargetIp(cidrBlock: string, offset: number): string {
    const [networkAddress] = cidrBlock.split('/');
    const octets = networkAddress.split('.').map(Number);
    if (octets.length !== 4) return `10.60.0.${2 + offset}`;
    return `${octets[0]}.${octets[1]}.${octets[2]}.${octets[3] + 2 + offset}`;
}

function computeAttackboxIp(cidrBlock: string): string {
    const [networkAddress] = cidrBlock.split('/');
    const octets = networkAddress.split('.').map(Number);
    if (octets.length !== 4) return '10.60.0.14';
    return `${octets[0]}.${octets[1]}.${octets[2]}.${octets[3] + 14}`;
}

function buildContainerName(targetName: string, sessionCode: string): string {
    return `ctf-${targetName}-${sessionCode}`.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 63);
}

/* ------------------------------------------------------------------ */
/*  Endpoints                                                          */
/* ------------------------------------------------------------------ */

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'lab-orchestrator',
        dockerActionsEnabled: LAB_ENABLE_DOCKER_ACTIONS,
        timestamp: new Date().toISOString(),
    });
});

app.post('/orchestrator/sessions/provision', requireSecret, async (req: Request, res: Response) => {
    try {
        const sessionCode = String(req.body?.sessionCode || '').trim();
        const networkName = String(req.body?.networkName || '').trim();
        const cidrBlock = String(req.body?.cidrBlock || '').trim();
        const machineIp = String(req.body?.machineIp || '').trim();

        if (!sessionCode || !networkName || !cidrBlock || !machineIp) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: sessionCode, networkName, cidrBlock, machineIp',
            });
        }

        const manifest = req.body?.manifest && typeof req.body.manifest === 'object'
            ? req.body.manifest
            : {};
        const attackboxPath = String(req.body?.attackboxPath || `${LAB_ACCESS_PROXY_BASE_PATH}/sessions/${sessionCode}/attackbox`);
        const targets = Array.isArray(manifest.targets) ? manifest.targets : [];

        const instances: Array<Record<string, any>> = [];

        if (LAB_ENABLE_DOCKER_ACTIONS) {
            // 1. Create isolated network
            await ensureNetwork(networkName, cidrBlock);

            // 2. Create target containers
            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                const targetName = String(target?.name || `target-${i}`);
                const targetImage = String(target?.image || 'shared-target');
                const targetIp = computeTargetIp(cidrBlock, i);
                const containerName = buildContainerName(targetName, sessionCode);

                // Build environment: resolve inter-target references
                const env: string[] = [];
                for (let j = 0; j < targets.length; j++) {
                    if (j !== i) {
                        const otherName = String(targets[j]?.name || `target-${j}`).toUpperCase().replace(/-/g, '_');
                        const otherIp = computeTargetIp(cidrBlock, j);
                        const otherPort = Number(targets[j]?.internalPort || 80);
                        env.push(`${otherName}_URL=http://${otherIp}:${otherPort}`);
                    }
                }

                try {
                    const result = await createAndStartContainer({
                        name: containerName,
                        image: targetImage,
                        networkName,
                        ipAddress: targetIp,
                        sessionCode,
                        env,
                    });

                    instances.push({
                        instanceKind: 'TARGET',
                        instanceName: containerName,
                        containerId: result.containerId,
                        image: targetImage,
                        internalIp: targetIp,
                        accessHost: null,
                        accessPort: null,
                        metadata: { dockerActionsEnabled: true, targetName, port: target?.internalPort },
                    });
                } catch (error: any) {
                    console.error(`[orchestrator] failed to create target ${containerName}: ${error.message}`);
                    instances.push({
                        instanceKind: 'TARGET',
                        instanceName: containerName,
                        containerId: null,
                        image: targetImage,
                        internalIp: targetIp,
                        accessHost: null,
                        accessPort: null,
                        metadata: { dockerActionsEnabled: true, error: error.message },
                    });
                }
            }

            // 3. Connect AttackBox to session network
            const attackboxIp = computeAttackboxIp(cidrBlock);
            try {
                await connectToNetwork(networkName, LAB_ATTACKBOX_CONTAINER_NAME, attackboxIp);
                console.log(`[orchestrator] connected ${LAB_ATTACKBOX_CONTAINER_NAME} to ${networkName} at ${attackboxIp}`);
            } catch (error: any) {
                console.error(`[orchestrator] failed to connect attackbox: ${error.message}`);
            }

            instances.unshift({
                instanceKind: 'ATTACKBOX',
                instanceName: `attackbox-${sessionCode}`,
                containerId: null,
                image: LAB_ATTACKBOX_CONTAINER_IMAGE,
                internalIp: attackboxIp,
                accessHost: LAB_ATTACKBOX_CONTAINER_NAME,
                accessPort: 7681,
                metadata: { dockerActionsEnabled: true, shared: true },
            });
        } else {
            const primaryTarget = targets[0] || {};
            instances.push({
                instanceKind: 'ATTACKBOX',
                instanceName: `attackbox-${sessionCode}`,
                containerId: null,
                image: LAB_ATTACKBOX_CONTAINER_IMAGE,
                internalIp: null,
                accessHost: 'ctf-attackbox',
                accessPort: 7681,
                metadata: { dockerActionsEnabled: false },
            });
            instances.push({
                instanceKind: 'TARGET',
                instanceName: `${String(primaryTarget?.name || 'target')}-${sessionCode}`.slice(0, 63),
                containerId: null,
                image: String(primaryTarget?.image || 'shared-target'),
                internalIp: machineIp,
                accessHost: null,
                accessPort: null,
                metadata: { dockerActionsEnabled: false },
            });
        }

        return res.json({
            success: true,
            machineIp,
            attackboxPath,
            attackboxHost: LAB_ATTACKBOX_CONTAINER_NAME,
            attackboxPort: 7681,
            instances,
        });
    } catch (error: any) {
        console.error(`[orchestrator] provision error: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Provision failed',
        });
    }
});

app.delete('/orchestrator/sessions/:sessionCode', requireSecret, async (req: Request, res: Response) => {
    try {
        const sessionCode = String(req.params.sessionCode || '').trim();
        if (!sessionCode) {
            return res.status(400).json({ success: false, error: 'Missing sessionCode' });
        }

        if (LAB_ENABLE_DOCKER_ACTIONS) {
            // 1. Stop & remove all session containers
            const containers = await listSessionContainers(sessionCode);
            for (const c of containers) {
                console.log(`[orchestrator] removing container ${c.Id.slice(0, 12)} for session ${sessionCode}`);
                await stopAndRemoveContainer(c.Id);
            }

            // 2. Disconnect AttackBox from session network
            const networkName = `ctf-sess-${sessionCode}`.slice(0, 120);
            await disconnectFromNetwork(networkName, LAB_ATTACKBOX_CONTAINER_NAME);

            // 3. Remove network
            try {
                await dockerDelete(`/networks/${encodeURIComponent(networkName)}`);
            } catch (error: any) {
                console.warn(`[orchestrator] network removal failed: ${error.message}`);
            }
        }

        return res.json({ success: true, sessionCode });
    } catch (error: any) {
        console.error(`[orchestrator] terminate error: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Terminate failed',
        });
    }
});

app.post('/orchestrator/sessions/reconcile', requireSecret, async (req: Request, res: Response) => {
    if (!LAB_ENABLE_DOCKER_ACTIONS) {
        return res.json({ success: true, note: 'Docker actions disabled, skipping reconciliation.' });
    }

    try {
        const activeSessions: Array<{ sessionCode: string }> = req.body?.activeSessions || [];
        const activeSessionCodes = new Set(activeSessions.map((s) => s.sessionCode));

        const filters = JSON.stringify({ label: ['pmp.lab.orchestrator=true'] });
        const allContainers = await dockerGet(`/containers/json?all=true&filters=${encodeURIComponent(filters)}`);
        let orphansRemoved = 0;

        if (Array.isArray(allContainers)) {
            for (const c of allContainers) {
                const labels = c.Labels || {};
                const sessionLabel = labels['pmp.lab.session'] || '';
                if (sessionLabel && !activeSessionCodes.has(sessionLabel)) {
                    console.log(`[orchestrator] reconcile: removing orphan ${c.Id.slice(0, 12)} (session ${sessionLabel})`);
                    await stopAndRemoveContainer(c.Id);
                    orphansRemoved++;
                }
            }
        }

        const allNetworks = await dockerGet('/networks');
        let networksRemoved = 0;
        if (Array.isArray(allNetworks)) {
            for (const net of allNetworks) {
                const labels = net.Labels || {};
                if (labels['pmp.lab.orchestrator'] === 'true') {
                    const netName = String(net.Name || '');
                    const match = netName.match(/^ctf-sess-(.+)$/);
                    if (match && !activeSessionCodes.has(match[1])) {
                        await disconnectFromNetwork(netName, LAB_ATTACKBOX_CONTAINER_NAME);
                        try {
                            await dockerDelete(`/networks/${encodeURIComponent(netName)}`);
                            networksRemoved++;
                        } catch { /* ignore */ }
                    }
                }
            }
        }

        return res.json({ success: true, orphansRemoved, networksRemoved, activeSessionCount: activeSessionCodes.size });
    } catch (error: any) {
        console.error(`[orchestrator] reconcile error: ${error.message}`);
        return res.json({ success: true, note: `Reconciliation partial: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`[lab-orchestrator] listening on ${PORT} (dockerActions=${LAB_ENABLE_DOCKER_ACTIONS})`);
});
