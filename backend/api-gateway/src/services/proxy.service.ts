import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
const CircuitBreaker = require('opossum');
import { config } from '../config';
import { logger } from '../utils/logger';

// Service registry with circuit breakers
interface ServiceConfig {
    name: string;
    url: string;
    timeout?: number;
}

const services: Record<string, ServiceConfig> = {
    'sim-card-service': { name: 'Card Service', url: config.services.simCardService },
    'sim-pos-service': { name: 'POS Service', url: config.services.simPosService },
    'sim-acquirer-service': { name: 'Acquirer Service', url: config.services.simAcquirerService },
    'sim-network-switch': { name: 'Network Switch', url: config.services.simNetworkSwitch },
    'sim-issuer-service': { name: 'Issuer Service', url: config.services.simIssuerService },
    'sim-auth-engine': { name: 'Auth Engine', url: config.services.simAuthEngine },
    'sim-fraud-detection': { name: 'Fraud Detection', url: config.services.simFraudDetection },
    'crypto-service': { name: 'Crypto Service', url: config.services.cryptoService },
    'hsm-simulator': { name: 'HSM Simulator', url: config.services.hsmSimulator },
    'key-management': { name: 'Key Management', url: config.services.keyManagement }
};

// Circuit breakers per service
const circuitBreakers: Map<string, any> = new Map();

// Create axios instance with defaults
const createAxiosInstance = (baseURL: string): AxiosInstance => {
    return axios.create({
        baseURL,
        timeout: config.circuitBreaker.timeout,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

/**
 * Get or create circuit breaker for a service
 */
const getCircuitBreaker = (serviceName: string): any => {
    if (!circuitBreakers.has(serviceName)) {
        const service = services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }

        const axiosInstance = createAxiosInstance(service.url);

        const breaker = new CircuitBreaker(
            async (method: string, path: string, data?: any, headers?: any) => {
                const response = await axiosInstance.request({
                    method,
                    url: path,
                    data,
                    headers
                });
                return response;
            },
            {
                timeout: config.circuitBreaker.timeout,
                errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
                resetTimeout: config.circuitBreaker.resetTimeout,
                name: serviceName
            }
        );

        breaker.on('open', () => {
            logger.warn(`Circuit breaker OPEN for ${serviceName}`);
        });

        breaker.on('halfOpen', () => {
            logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`);
        });

        breaker.on('close', () => {
            logger.info(`Circuit breaker CLOSED for ${serviceName}`);
        });

        circuitBreakers.set(serviceName, breaker);
    }

    return circuitBreakers.get(serviceName)!;
};

export interface ProxyRequest {
    serviceName: string;
    method: string;
    path: string;
    data?: any;
    headers?: Record<string, string>;
    correlationId?: string;
}

export interface ProxyResponse {
    status: number;
    data: any;
    headers: Record<string, string>;
}

/**
 * Proxy a request to a backend service with circuit breaker
 */
export const proxyRequest = async (request: ProxyRequest): Promise<ProxyResponse> => {
    const { serviceName, method, path, data, headers, correlationId } = request;

    const service = services[serviceName];
    if (!service) {
        throw new Error(`Unknown service: ${serviceName}`);
    }

    const breaker = getCircuitBreaker(serviceName);

    const proxyHeaders = {
        ...headers,
        'X-Correlation-ID': correlationId || '',
        'X-Forwarded-By': 'api-gateway'
    };

    logger.debug('Proxying request', {
        correlationId,
        service: serviceName,
        method,
        path
    });

    try {
        const response: AxiosResponse = await breaker.fire(method, path, data, proxyHeaders);

        return {
            status: response.status,
            data: response.data,
            headers: response.headers as Record<string, string>
        };
    } catch (error) {
        if ((error as any).code === 'EOPENBREAKER') {
            logger.error('Circuit breaker open', { serviceName, correlationId });
            throw {
                statusCode: 503,
                message: `Service ${service.name} temporarily unavailable`,
                code: 'SERVICE_UNAVAILABLE'
            };
        }

        const axiosError = error as AxiosError;
        if (axiosError.response) {
            return {
                status: axiosError.response.status,
                data: axiosError.response.data,
                headers: axiosError.response.headers as Record<string, string>
            };
        }

        logger.error('Proxy error', {
            serviceName,
            correlationId,
            error: (error as Error).message
        });

        throw {
            statusCode: 502,
            message: `Failed to connect to ${service.name}`,
            code: 'BAD_GATEWAY'
        };
    }
};

/**
 * Get service health status
 */
export const getServiceHealth = async (serviceName: string): Promise<{ healthy: boolean; latency?: number }> => {
    const service = services[serviceName];
    if (!service) {
        return { healthy: false };
    }

    const start = Date.now();
    try {
        const response = await axios.get(`${service.url}/health`, { timeout: 3000 });
        return {
            healthy: response.status === 200,
            latency: Date.now() - start
        };
    } catch {
        return { healthy: false, latency: Date.now() - start };
    }
};

/**
 * Get all services health status
 */
export const getAllServicesHealth = async (): Promise<Record<string, { healthy: boolean; latency?: number }>> => {
    const results: Record<string, { healthy: boolean; latency?: number }> = {};

    await Promise.all(
        Object.keys(services).map(async (serviceName) => {
            results[serviceName] = await getServiceHealth(serviceName);
        })
    );

    return results;
};

/**
 * Get service URL
 */
export const getServiceUrl = (serviceName: string): string | null => {
    return services[serviceName]?.url || null;
};
