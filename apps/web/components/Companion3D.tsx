"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Color, MathUtils } from 'three';

// ----------------------------------------------------------------------
// AvatarExpressionController Abstraction
// In a real app with a GLB, this controller would map emotions to
// specific morph targets (blendshapes) like 'smile', 'browInnerUp', etc.
// Here we map emotions to abstract physical characteristics of a placeholder.
// ----------------------------------------------------------------------

type Emotion = 'neutral'|'happy'|'excited'|'sad'|'concerned'|'empathetic'|'encouraging'|'proud'|'curious'|'thinking'|'surprised'|'calm';

interface AvatarState {
  color: string;
  bounceSpeed: number;
  bounceHeight: number;
  squashStretch: number;
  tilt: number;
}

const EMOTION_MAP: Record<Emotion, AvatarState> = {
  neutral:     { color: '#3b82f6', bounceSpeed: 1.0, bounceHeight: 0.1, squashStretch: 0.05, tilt: 0 },
  happy:       { color: '#10b981', bounceSpeed: 2.0, bounceHeight: 0.2, squashStretch: 0.1, tilt: 0.1 },
  excited:     { color: '#f59e0b', bounceSpeed: 4.0, bounceHeight: 0.4, squashStretch: 0.2, tilt: 0 },
  sad:         { color: '#6366f1', bounceSpeed: 0.5, bounceHeight: 0.05, squashStretch: 0.02, tilt: -0.2 },
  concerned:   { color: '#8b5cf6', bounceSpeed: 0.8, bounceHeight: 0.05, squashStretch: 0.05, tilt: 0.15 },
  empathetic:  { color: '#ec4899', bounceSpeed: 1.0, bounceHeight: 0.08, squashStretch: 0.08, tilt: 0.2 },
  encouraging: { color: '#f43f5e', bounceSpeed: 1.5, bounceHeight: 0.15, squashStretch: 0.1, tilt: 0 },
  proud:       { color: '#0ea5e9', bounceSpeed: 1.2, bounceHeight: 0.12, squashStretch: 0.05, tilt: -0.1 },
  curious:     { color: '#a855f7', bounceSpeed: 1.5, bounceHeight: 0.1, squashStretch: 0.05, tilt: 0.3 },
  thinking:    { color: '#6b7280', bounceSpeed: 0.5, bounceHeight: 0.05, squashStretch: 0.02, tilt: 0.25 },
  surprised:   { color: '#eab308', bounceSpeed: 3.0, bounceHeight: 0.3, squashStretch: -0.1, tilt: 0 },
  calm:        { color: '#14b8a6', bounceSpeed: 0.8, bounceHeight: 0.08, squashStretch: 0.04, tilt: 0 },
};

export function Companion3D({ emotion = 'neutral' }: { emotion?: string, intensity?: number }) {
  const meshRef = useRef<Mesh>(null);
  const targetState = EMOTION_MAP[emotion as Emotion] || EMOTION_MAP['neutral'];
  const [currentColor] = useState(() => new Color(targetState.color));
  
  // Smoothing values
  const currentBounceSpeed = useRef(targetState.bounceSpeed);
  const currentBounceHeight = useRef(targetState.bounceHeight);
  const currentTilt = useRef(targetState.tilt);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth transitions for parameters
    currentBounceSpeed.current = MathUtils.lerp(currentBounceSpeed.current, targetState.bounceSpeed, delta * 2);
    currentBounceHeight.current = MathUtils.lerp(currentBounceHeight.current, targetState.bounceHeight, delta * 2);
    currentTilt.current = MathUtils.lerp(currentTilt.current, targetState.tilt, delta * 2);
    
    // Smooth transition for color
    currentColor.lerp(new Color(targetState.color), delta * 2);
    (meshRef.current.material as MeshStandardMaterial).color.copy(currentColor);

    // Apply animation based on time (idle breathing/bouncing)
    const time = state.clock.elapsedTime;
    
    // Base floating
    meshRef.current.position.y = Math.sin(time * currentBounceSpeed.current) * currentBounceHeight.current;
    
    // Base rotation (idle + tilt)
    meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.2; 
    meshRef.current.rotation.z = currentTilt.current;
    
    // Squash and stretch (breathing effect)
    const ss = targetState.squashStretch * Math.sin(time * currentBounceSpeed.current * 2);
    meshRef.current.scale.set(1 - ss, 1 + ss, 1 - ss);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.8}
        envMapIntensity={1}
      />
    </mesh>
  );
}
