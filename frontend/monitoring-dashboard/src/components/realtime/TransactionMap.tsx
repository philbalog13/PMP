/**
 * 3D Transaction Map Component
 * Interactive globe with transaction arcs using Three.js / React Three Fiber
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Transaction } from '../../hooks/useWebSocket';

interface MapPoint {
    key: string;
    lat: number;
    lng: number;
    status: 'success' | 'error';
}

interface TransactionMapProps {
    transactions: Transaction[];
    maxPoints?: number;
}

const FALLBACK_POINTS: Array<[number, number, 'success' | 'error']> = [
    [48.8566, 2.3522, 'success'],
    [51.5074, -0.1278, 'success'],
    [40.7128, -74.006, 'success'],
    [35.6762, 139.6503, 'success'],
    [6.5244, 3.3792, 'error'],
    [34.0522, -118.2437, 'success'],
    [25.2048, 55.2708, 'error'],
    [52.52, 13.405, 'success'],
    [45.4642, 9.19, 'success'],
    [-33.8688, 151.2093, 'error'],
    [-23.5505, -46.6333, 'success'],
    [19.4326, -99.1332, 'success']
];

function hasValidLocation(txn: Transaction): txn is Transaction & { location: { lat: number; lng: number } } {
    return Boolean(
        txn.location &&
        Number.isFinite(txn.location.lat) &&
        Number.isFinite(txn.location.lng)
    );
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function Globe() {
    return (
        <mesh>
            <sphereGeometry args={[2, 48, 48]} />
            <meshStandardMaterial
                color="#10213f"
                emissive="#081124"
                emissiveIntensity={0.55}
                wireframe
                transparent
                opacity={0.85}
            />
            <mesh>
                <sphereGeometry args={[1.98, 48, 48]} />
                <meshBasicMaterial color="#030712" />
            </mesh>
        </mesh>
    );
}

function Arc({ start, end, color }: { start: THREE.Vector3; end: THREE.Vector3; color: string }) {
    const points = useMemo(() => {
        const mid = start
            .clone()
            .add(end)
            .multiplyScalar(0.5)
            .normalize()
            .multiplyScalar(2.45);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        return curve.getPoints(44);
    }, [start, end]);

    const arcPositions = useMemo(
        () => new Float32Array(points.flatMap((point) => [point.x, point.y, point.z])),
        [points]
    );

    return (
        <line>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    array={arcPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <lineBasicMaterial color={color} opacity={0.68} transparent />
        </line>
    );
}

function Marker({ position, color, size }: { position: THREE.Vector3; color: string; size: number }) {
    return (
        <mesh position={position}>
            <sphereGeometry args={[size, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
    );
}

function Transactions({ points }: { points: MapPoint[] }) {
    const serverPosition = useMemo(() => latLngToVector3(48.8566, 2.3522, 2), []);
    const renderedPoints = useMemo(
        () =>
            points.map((point) => ({
                ...point,
                vector: latLngToVector3(point.lat, point.lng, 2),
                color: point.status === 'success' ? '#22c55e' : '#ef4444'
            })),
        [points]
    );

    return (
        <group>
            <Marker position={serverPosition} color="#60a5fa" size={0.06} />
            {renderedPoints.map((point) => (
                <group key={point.key}>
                    <Marker position={point.vector} color={point.color} size={0.034} />
                    <Arc start={point.vector} end={serverPosition} color={point.color} />
                </group>
            ))}
        </group>
    );
}

export default function TransactionMap({ transactions, maxPoints = 20 }: TransactionMapProps) {
    const points = useMemo(() => {
        const withLocation: MapPoint[] = transactions
            .filter(hasValidLocation)
            .slice(0, maxPoints)
            .map((txn): MapPoint => ({
                key: txn.id,
                lat: txn.location.lat,
                lng: txn.location.lng,
                status: txn.responseCode === '00' ? 'success' : 'error'
            }));

        if (withLocation.length > 0) {
            return withLocation;
        }

        return FALLBACK_POINTS.slice(0, Math.min(maxPoints, FALLBACK_POINTS.length)).map((point, index): MapPoint => ({
            key: `fallback-${index}`,
            lat: point[0],
            lng: point[1],
            status: point[2]
        }));
    }, [transactions, maxPoints]);

    const totals = useMemo(
        () =>
            points.reduce(
                (acc, point) => {
                    if (point.status === 'success') {
                        acc.success += 1;
                    } else {
                        acc.error += 1;
                    }
                    return acc;
                },
                { success: 0, error: 0 }
            ),
        [points]
    );

    return (
        <div className="map-shell">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
                <color attach="background" args={['#060d1f']} />
                <ambientLight intensity={0.55} />
                <pointLight position={[10, 10, 10]} intensity={1.2} />
                <Stars radius={90} depth={45} count={1800} factor={3} saturation={0} fade speed={0.5} />
                <Globe />
                <Transactions points={points} />
                <OrbitControls
                    enablePan={false}
                    enableZoom
                    minDistance={3}
                    maxDistance={8}
                    autoRotate
                    autoRotateSpeed={0.45}
                />
            </Canvas>

            <div className="map-overlay">
                <div className="map-overlay-title">Flux temps reel</div>
                <div className="map-legend">
                    <span className="map-legend-item">
                        <span className="map-dot success" />
                        Succes: {totals.success}
                    </span>
                    <span className="map-legend-item">
                        <span className="map-dot error" />
                        Echecs: {totals.error}
                    </span>
                </div>
            </div>
        </div>
    );
}
