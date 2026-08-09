"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Color, MathUtils, Group } from 'three';

// ----------------------------------------------------------------------
// AvatarExpressionController
// A unified state manager that translates conceptual emotions into 
// physical morph/transform properties for the 3D model.
// ----------------------------------------------------------------------

type Emotion = 'neutral'|'happy'|'excited'|'sad'|'concerned'|'empathetic'|'encouraging'|'proud'|'curious'|'thinking'|'surprised'|'calm'|'frustrated'|'sleepy';

interface PhysicalState {
  color: string;
  bounceSpeed: number;
  bounceHeight: number;
  tilt: number;
  eyeScaleY: number;
  mouthCurve: number; // Positive = smile, Negative = frown
  mouthScaleX: number;
  mouthScaleY: number;
  browTilt: number;
}

const EMOTION_MAP: Record<Emotion, PhysicalState> = {
  neutral:     { color: '#3b82f6', bounceSpeed: 1.0, bounceHeight: 0.1, tilt: 0, eyeScaleY: 1.0, mouthCurve: 0, mouthScaleX: 1.0, mouthScaleY: 1.0, browTilt: 0 },
  happy:       { color: '#10b981', bounceSpeed: 2.0, bounceHeight: 0.2, tilt: 0.1, eyeScaleY: 1.2, mouthCurve: 0.5, mouthScaleX: 1.2, mouthScaleY: 1.5, browTilt: 0.2 },
  excited:     { color: '#f59e0b', bounceSpeed: 4.0, bounceHeight: 0.4, tilt: 0, eyeScaleY: 1.5, mouthCurve: 0.8, mouthScaleX: 1.5, mouthScaleY: 2.0, browTilt: 0.5 },
  sad:         { color: '#6366f1', bounceSpeed: 0.5, bounceHeight: 0.05, tilt: -0.2, eyeScaleY: 0.7, mouthCurve: -0.5, mouthScaleX: 0.8, mouthScaleY: 0.5, browTilt: -0.3 },
  concerned:   { color: '#8b5cf6', bounceSpeed: 0.8, bounceHeight: 0.05, tilt: 0.15, eyeScaleY: 0.9, mouthCurve: -0.2, mouthScaleX: 0.9, mouthScaleY: 0.8, browTilt: -0.5 },
  empathetic:  { color: '#ec4899', bounceSpeed: 1.0, bounceHeight: 0.08, tilt: 0.2, eyeScaleY: 1.1, mouthCurve: 0.2, mouthScaleX: 1.0, mouthScaleY: 1.0, browTilt: -0.2 },
  encouraging: { color: '#f43f5e', bounceSpeed: 1.5, bounceHeight: 0.15, tilt: 0, eyeScaleY: 1.2, mouthCurve: 0.4, mouthScaleX: 1.1, mouthScaleY: 1.2, browTilt: 0.3 },
  proud:       { color: '#0ea5e9', bounceSpeed: 1.2, bounceHeight: 0.12, tilt: -0.1, eyeScaleY: 1.1, mouthCurve: 0.3, mouthScaleX: 1.1, mouthScaleY: 1.0, browTilt: 0.1 },
  curious:     { color: '#a855f7', bounceSpeed: 1.5, bounceHeight: 0.1, tilt: 0.3, eyeScaleY: 1.3, mouthCurve: 0, mouthScaleX: 0.8, mouthScaleY: 1.2, browTilt: 0.4 },
  thinking:    { color: '#6b7280', bounceSpeed: 0.5, bounceHeight: 0.05, tilt: 0.25, eyeScaleY: 0.8, mouthCurve: 0, mouthScaleX: 0.9, mouthScaleY: 0.8, browTilt: -0.1 },
  surprised:   { color: '#eab308', bounceSpeed: 3.0, bounceHeight: 0.3, tilt: 0, eyeScaleY: 1.8, mouthCurve: -0.2, mouthScaleX: 0.6, mouthScaleY: 2.0, browTilt: 0.6 },
  calm:        { color: '#14b8a6', bounceSpeed: 0.8, bounceHeight: 0.08, tilt: 0, eyeScaleY: 0.9, mouthCurve: 0.1, mouthScaleX: 1.0, mouthScaleY: 0.9, browTilt: 0 },
  frustrated:  { color: '#ef4444', bounceSpeed: 1.5, bounceHeight: 0.05, tilt: -0.1, eyeScaleY: 0.6, mouthCurve: -0.4, mouthScaleX: 1.1, mouthScaleY: 0.5, browTilt: -0.6 },
  sleepy:      { color: '#475569', bounceSpeed: 0.3, bounceHeight: 0.02, tilt: -0.3, eyeScaleY: 0.2, mouthCurve: 0, mouthScaleX: 0.8, mouthScaleY: 0.5, browTilt: -0.1 },
};

// ----------------------------------------------------------------------
// Appearance Configuration (Data-Driven)
// ----------------------------------------------------------------------
export interface AvatarAppearance {
  primaryColor?: string;
  hasGlasses?: boolean;
  eyeColor?: string;
}

interface Companion3DProps {
  emotion?: string;
  intensity?: number;
  appearance?: AvatarAppearance;
  isSpeaking?: boolean;
}

export function Companion3D({ 
  emotion = 'neutral', 
  appearance,
  isSpeaking = false 
}: Companion3DProps) {
  
  const targetState = EMOTION_MAP[emotion as Emotion] || EMOTION_MAP['neutral'];
  const baseColor = appearance?.primaryColor || targetState.color;
  const [currentColor] = useState(() => new Color(baseColor));
  
  // Refs for hierarchical parts
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const bodyRef = useRef<Mesh>(null);
  
  const eyeLRef = useRef<Mesh>(null);
  const eyeRRef = useRef<Mesh>(null);
  const mouthRef = useRef<Mesh>(null);

  // Smoothing refs
  const currentBounce = useRef({ speed: targetState.bounceSpeed, height: targetState.bounceHeight });
  const currentTilt = useRef(targetState.tilt);
  const currentEyeScaleY = useRef(targetState.eyeScaleY);
  const currentMouthCurve = useRef(targetState.mouthCurve);
  const currentMouthScaleX = useRef(targetState.mouthScaleX);
  const currentMouthScaleY = useRef(targetState.mouthScaleY);

  useFrame((state, delta) => {
    if (!groupRef.current || !headRef.current || !mouthRef.current || !eyeLRef.current || !eyeRRef.current) return;
    
    // Smooth transitions
    const lerpSpeed = delta * 5;
    currentBounce.current.speed = MathUtils.lerp(currentBounce.current.speed, targetState.bounceSpeed, lerpSpeed);
    currentBounce.current.height = MathUtils.lerp(currentBounce.current.height, targetState.bounceHeight, lerpSpeed);
    currentTilt.current = MathUtils.lerp(currentTilt.current, targetState.tilt, lerpSpeed);
    currentEyeScaleY.current = MathUtils.lerp(currentEyeScaleY.current, targetState.eyeScaleY, lerpSpeed);
    currentMouthCurve.current = MathUtils.lerp(currentMouthCurve.current, targetState.mouthCurve, lerpSpeed);
    currentMouthScaleX.current = MathUtils.lerp(currentMouthScaleX.current, targetState.mouthScaleX, lerpSpeed);
    currentMouthScaleY.current = MathUtils.lerp(currentMouthScaleY.current, targetState.mouthScaleY, lerpSpeed);
    
    currentColor.lerp(new Color(baseColor), lerpSpeed);
    
    const time = state.clock.elapsedTime;
    
    // Global Idle Animation (Floating and Breathing)
    groupRef.current.position.y = Math.sin(time * currentBounce.current.speed) * currentBounce.current.height;
    groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.2; 
    
    // Head Tilt & Bob
    headRef.current.rotation.z = currentTilt.current;
    headRef.current.rotation.x = Math.sin(time * currentBounce.current.speed * 0.5) * 0.05;

    // Body Squash and Stretch (breathing)
    if (bodyRef.current) {
      const breathing = Math.sin(time * 2) * 0.02;
      bodyRef.current.scale.set(1 - breathing, 1 + breathing, 1 - breathing);
    }
    
    // Facial Expressions
    // Blinking logic (random blink every few seconds)
    const isBlinking = Math.sin(time * 5) > 0.98;
    const eyeY = isBlinking ? 0.1 : currentEyeScaleY.current;
    eyeLRef.current.scale.y = eyeY;
    eyeRRef.current.scale.y = eyeY;

    // Mouth animation (talking + expression)
    const talkPulse = isSpeaking ? (Math.random() * 0.5 + 0.5) : 1.0;
    mouthRef.current.scale.set(
      currentMouthScaleX.current, 
      currentMouthScaleY.current * talkPulse, 
      1
    );
    
    // Abstract mouth curve by rotating slightly and moving it
    // In a real GLB, this would directly drive morph targets
    mouthRef.current.position.y = -0.3 + (currentMouthCurve.current * 0.1);
    
    // Color application
    (headRef.current.material as MeshStandardMaterial).color.copy(currentColor);
    if (bodyRef.current) {
       (bodyRef.current.material as MeshStandardMaterial).color.copy(currentColor);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.8, 0.5, 1.5, 32]} />
        <meshStandardMaterial roughness={0.3} metalness={0.2} />
      </mesh>
      
      {/* Head */}
      <mesh ref={headRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshStandardMaterial roughness={0.2} metalness={0.1} />
        
        {/* Face Elements attached to head */}
        {/* Left Eye */}
        <mesh ref={eyeLRef} position={[-0.35, 0.2, 0.81]}>
          <planeGeometry args={[0.2, 0.4]} />
          <meshBasicMaterial color={appearance?.eyeColor || "#ffffff"} />
        </mesh>
        
        {/* Right Eye */}
        <mesh ref={eyeRRef} position={[0.35, 0.2, 0.81]}>
          <planeGeometry args={[0.2, 0.4]} />
          <meshBasicMaterial color={appearance?.eyeColor || "#ffffff"} />
        </mesh>
        
        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, -0.3, 0.81]}>
          <planeGeometry args={[0.4, 0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Glasses (Data-driven accessory) */}
        {appearance?.hasGlasses && (
          <group position={[0, 0.2, 0.82]}>
            <mesh position={[-0.35, 0, 0]}>
              <ringGeometry args={[0.25, 0.3, 32]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[0.35, 0, 0]}>
              <ringGeometry args={[0.25, 0.3, 32]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.2, 0.05]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </group>
        )}
      </mesh>
    </group>
  );
}
