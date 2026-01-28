/**
 * 3D Transaction Map Component
 * Interactive globe with transaction arcs using Three.js / React Three Fiber
 */

import { useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// Types
interface TransactionLoc {
    id: string;
    lat: number;
    lng: number;
    amount: number;
    status: 'success' | 'error';
    timestamp: number;
}

// Convert Lat/Lng to Vector3
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

// Globe Mesh
function Globe() {
    // Using a simple color map for reliability instead of external URL that might fail
    // In a real app, use: useLoader(THREE.TextureLoader, '/textures/earth.jpg')

    return (
        <mesh>
            <sphereGeometry args={[2, 64, 64]} />
            <meshStandardMaterial
                color="#1a1a2e"
                emissive="#0f0f23"
                emissiveIntensity={0.5}
                wireframe={true}
                transparent
                opacity={0.8}
            />
            <mesh>
                <sphereGeometry args={[1.98, 64, 64]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
        </mesh>
    );
}

// Transaction Arc
function Arc({ start, end, color }: { start: THREE.Vector3; end: THREE.Vector3; color: string }) {
    const curve = useMemo(() => {
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(2.5); // 2.5 is arc height
        return new THREE.QuadraticBezierCurve3(start, mid, end);
    }, [start, end]);

    const points = useMemo(() => curve.getPoints(50), [curve]);

    return (
        <line>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
                    itemSize={3}
                />
            </bufferGeometry>
            <lineBasicMaterial color={color} opacity={0.6} transparent linewidth={2} />
        </line>
    );
}

// Transaction Marker (Ping)
function Marker({ position, color, size }: { position: THREE.Vector3; color: string; size: number }) {
    return (
        <mesh position={position}>
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color={color} />
            <Html distanceFactor={10}>
                <div style={{
                    width: '10px',
                    height: '10px',
                    background: color,
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${color}`
                }} />
            </Html>
        </mesh>
    );
}

// Animated Transactions
function Transactions({ data }: { data: TransactionLoc[] }) {
    // Center is approx Paris (Server location)
    const serverPos = useMemo(() => latLngToVector3(48.8566, 2.3522, 2), []);

    return (
        <group>
            {/* Server Node */}
            <Marker position={serverPos} color="#7c3aed" size={0.05} />

            {/* Transaction Lines and Nodes */}
            {data.map((txn) => {
                const pos = latLngToVector3(txn.lat, txn.lng, 2);
                const color = txn.status === 'success' ? '#22c55e' : '#ef4444';

                return (
                    <group key={txn.id}>
                        <Marker position={pos} color={color} size={0.03} />
                        <Arc start={pos} end={serverPos} color={color} />
                    </group>
                );
            })}
        </group>
    );
}

// Main Map Component
export default function TransactionMap() {
    // Simulated data
    const [transactions, setTransactions] = useState<TransactionLoc[]>([]);

    useEffect(() => {
        // Initial data
        const generateTxn = () => ({
            id: Math.random().toString(36),
            lat: (Math.random() - 0.5) * 160,
            lng: (Math.random() - 0.5) * 360,
            amount: Math.random() * 1000,
            status: Math.random() > 0.1 ? 'success' as const : 'error' as const,
            timestamp: Date.now()
        });

        setTransactions(Array.from({ length: 15 }, generateTxn));

        // Live updates
        const interval = setInterval(() => {
            setTransactions(prev => [
                generateTxn(),
                ...prev.slice(0, 19)
            ]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: '100%', height: '500px', background: '#0f0f23', borderRadius: '12px', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Globe />
                <Transactions data={transactions} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minDistance={3}
                    maxDistance={8}
                    autoRotate
                    autoRotateSpeed={0.5}
                />
            </Canvas>

            {/* Overlay Stats */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                background: 'rgba(15, 15, 35, 0.8)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(5px)',
                pointerEvents: 'none'
            }}>
                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>Flux Temps Réel</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                        <span style={{ color: '#aaa', fontSize: '10px' }}>Succès</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <span style={{ color: '#aaa', fontSize: '10px' }}>Échec</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
