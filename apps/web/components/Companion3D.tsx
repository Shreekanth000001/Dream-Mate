"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Group, SkinnedMesh, AnimationMixer, AnimationClip, LoopRepeat, LoopOnce } from 'three';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';
import { CHARACTER_REGISTRY } from '@/lib/characters';

export interface AvatarAppearance {
  baseAvatar?: string;
  primaryColor?: string; // Clothing
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
  hasGlasses?: boolean;
  hairStyle?: string;
  outfit?: string;
  eyeStyle?: string;
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };
  camera?: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export interface AvatarCapabilities {
  hasHumanoidRig: boolean;
  hasFacialMorphs: boolean;
  hasAnimations: boolean;
  hasGlasses: boolean;
  hasHair: boolean;
  hasClothing: boolean;
  hasMultipleHairStyles: boolean;
  hasMultipleOutfits: boolean;
  hasMultipleEyeStyles: boolean;
  hasHairColor: boolean;
  hasSkinColor: boolean;
  hasClothingColor: boolean;
  hasEyeColor: boolean;
}

interface Companion3DProps {
  emotion?: string;
  gesture?: string;
  emoji?: string;
  appearance?: AvatarAppearance;
  isSpeaking?: boolean;
  onCapabilitiesLoaded?: (caps: AvatarCapabilities) => void;
}

const EMOTION_TARGETS: Record<string, Record<string, number>> = {
  neutral: { mouthSmile: 0, mouthFrown: 0, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 0 },
  happy: { mouthSmile: 0.8, mouthFrown: 0, eyeWideLeft: 0.2, eyeWideRight: 0.2, browInnerUp: 0 },
  excited: { mouthSmile: 1.0, mouthFrown: 0, eyeWideLeft: 0.5, eyeWideRight: 0.5, jawOpen: 0.3, browInnerUp: 0.3 },
  sad: { mouthSmile: 0, mouthFrown: 0.8, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 1.0, mouthRollLower: 0.5 },
  concerned: { mouthSmile: 0, mouthFrown: 0.5, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 0.8 },
  surprised: { mouthSmile: 0, mouthFrown: 0, eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.8, browInnerUp: 1.0 },
  thinking: { mouthSmile: 0, mouthFrown: 0, eyeWideLeft: 0, eyeWideRight: 0, browInnerUp: 0.5, eyeSquintLeft: 0.5, eyeSquintRight: 0.5 },
};

// Internal component that receives the loaded GLTF and plays animations
function AvatarRenderer({ 
  gltf, 
  emotion = 'neutral', 
  gesture = 'none', 
  emoji, 
  appearance, 
  isSpeaking = false,
  onCapabilitiesLoaded
}: Companion3DProps & { gltf: any }) {
  const groupRef = useRef<Group>(null);
  
  // Clone scene to prevent modifying the cached loader result directly
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  const baseAnimations = gltf.animations || [];

  // Load external animations safely
  const [externalAnimations, setExternalAnimations] = useState<AnimationClip[]>([]);
  useEffect(() => {
    fetch('/animations.glb', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          const loader = new GLTFLoader();
          loader.load('/animations.glb', (animGltf) => {
            setExternalAnimations(animGltf.animations);
          }, undefined, () => {});
        }
      })
      .catch(() => {}); // Ignore network errors
  }, []);

  const allAnimations = useMemo(() => [...baseAnimations, ...externalAnimations], [baseAnimations, externalAnimations]);
  
  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);

  // Handle Animation Playback (Gestures & Idle states)
  useEffect(() => {
    if (!allAnimations.length) return;
    mixer.stopAllAction();

    // Determine state
    let targetClipName = 'Idle';
    if (gesture && gesture !== 'none') {
      targetClipName = gesture; // e.g., 'wave', 'pointing'
    } else if (isSpeaking) {
      targetClipName = 'Talking';
    } else if (emotion === 'thinking') {
      targetClipName = 'Thinking';
    }

    // Try to find the exact clip, or fallback to first available
    let clip = allAnimations.find(a => a.name.toLowerCase().includes(targetClipName.toLowerCase()));
    if (!clip && targetClipName !== 'Idle') {
      clip = allAnimations.find(a => a.name.toLowerCase().includes('idle'));
    }
    if (!clip) clip = allAnimations[0];

    if (clip) {
      const action = mixer.clipAction(clip);
      // Play once for specific gestures, loop for idle/talking
      if (gesture !== 'none' && gesture !== 'idle') {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(LoopRepeat, Infinity);
      }
      action.reset().fadeIn(0.3).play();
    }
  }, [gesture, isSpeaking, emotion, allAnimations, mixer]);

  useFrame((state, delta) => {
    mixer.update(delta);
  });
  
  // Head Mesh & Morph Targets
  const headMesh = useMemo(() => {
    let found = null;
    scene.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh && (node as SkinnedMesh).morphTargetDictionary) {
        if (!found) found = node;
        if (node.name.toLowerCase().includes('head')) found = node;
      }
    });
    return found as SkinnedMesh | null;
  }, [scene]);

  // Fallback head tilt if no animations
  const headBone = useMemo(() => scene.getObjectByName('Head'), [scene]);

  // Emoji logic
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState(emoji);

  useEffect(() => {
    if (emoji && emoji !== currentEmoji) {
      setCurrentEmoji(emoji);
      setShowEmoji(true);
      const timer = setTimeout(() => setShowEmoji(false), 3000);
      return () => clearTimeout(timer);
    } else if (emoji && !showEmoji) {
      setShowEmoji(true);
      const timer = setTimeout(() => setShowEmoji(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emoji]);

  // Morph Targets
  useFrame((state, delta) => {
    if (!headMesh || !headMesh.morphTargetDictionary || !headMesh.morphTargetInfluences) return;
    
    const targetState = EMOTION_TARGETS[emotion] || EMOTION_TARGETS['neutral'];
    const lerpSpeed = Math.min(delta * 8, 1);
    const dict = headMesh.morphTargetDictionary;
    const influences = headMesh.morphTargetInfluences;

    const applyTarget = (keys: string[], targetValue: number) => {
      for (const key of keys) {
        if (dict[key] !== undefined) {
          const idx = dict[key];
          influences[idx] = MathUtils.lerp(influences[idx], targetValue, lerpSpeed);
        }
      }
    };
    
    // Apply full ARKit map if present, or fallback to primitive mouthSmile
    Object.entries(targetState).forEach(([key, val]) => {
      applyTarget([key, key + 'Left', key + 'Right'], val as number);
    });
    
    // Jaw Open/Speaking
    let targetJaw = targetState.jawOpen || 0;
    if (isSpeaking) {
      targetJaw = (Math.sin(state.clock.elapsedTime * 15) * 0.5 + 0.5) * 0.8;
    }
    applyTarget(['jawOpen', 'mouthOpen'], targetJaw);

    // Fallback body language (if no animations are playing)
    if (headBone && allAnimations.length === 0) {
      let tiltX = 0, tiltY = 0, tiltZ = 0;
      if (emotion === 'sad') tiltX = 0.2;
      else if (emotion === 'excited') tiltX = -0.2;
      else if (emotion === 'thinking') { tiltY = -0.2; tiltZ = -0.1; }
      else if (emotion === 'concerned') { tiltX = 0.1; tiltY = 0.1; tiltZ = -0.05; }
      
      headBone.rotation.x = MathUtils.lerp(headBone.rotation.x, tiltX, lerpSpeed);
      headBone.rotation.y = MathUtils.lerp(headBone.rotation.y, tiltY, lerpSpeed);
      headBone.rotation.z = MathUtils.lerp(headBone.rotation.z, tiltZ, lerpSpeed);
    }
  });
  
  // Customization
  useEffect(() => {
    let hasHumanoidRig = false;
    let hasFacialMorphs = false;
    let hasGlasses = false;
    let hasHair = false;
    let hasClothing = false;
    
    let hasHairColor = false;
    let hasSkinColor = false;
    let hasClothingColor = false;
    let hasEyeColor = false;

    // For future modular assets:
    // If we find multiple distinct meshes for hair (e.g. hair_1, hair_2), we set this to true.
    let hairMeshNames = new Set<string>();
    let outfitMeshNames = new Set<string>();
    let eyeMeshNames = new Set<string>();

    scene.traverse((node: any) => {
      if (node.isBone && (node.name.toLowerCase().includes('head') || node.name.toLowerCase().includes('spine'))) {
        hasHumanoidRig = true;
      }
      
      if (node.isMesh || node.isSkinnedMesh) {
        if (node.morphTargetDictionary && Object.keys(node.morphTargetDictionary).length > 0) {
          hasFacialMorphs = true;
        }

        const nodeName = node.name.toLowerCase();
        const matName = node.material?.name?.toLowerCase() || '';

        if (nodeName.includes('glass') || nodeName.includes('headwear') || matName.includes('glass')) {
          hasGlasses = true;
        }
        if (nodeName.includes('hair') || nodeName.includes('beard') || matName.includes('hair') || matName.includes('beard')) {
          hasHair = true;
          hasHairColor = true; // Assuming existing meshes allow tinting
          if (nodeName.includes('hair_')) hairMeshNames.add(nodeName);
        }
        if (matName.includes('shirt') || matName.includes('outfit') || matName.includes('top') || matName.includes('bottom')) {
          hasClothing = true;
          hasClothingColor = true;
          if (nodeName.includes('outfit_')) outfitMeshNames.add(nodeName);
        }
        if (matName.includes('skin') || matName.includes('body') || matName.includes('head')) {
          hasSkinColor = true;
        }
        if (matName.includes('eye') && !matName.includes('lash') && !matName.includes('brow')) {
          hasEyeColor = true;
          if (nodeName.includes('eye_')) eyeMeshNames.add(nodeName);
        }

        if (appearance?.primaryColor && (matName.includes('shirt') || matName.includes('outfit') || matName.includes('top') || matName.includes('bottom'))) {
          if (node.material.color) node.material.color.set(appearance.primaryColor);
        }
        if (appearance?.hairColor && (matName.includes('hair') || matName.includes('beard'))) {
          if (node.material.color) node.material.color.set(appearance.hairColor);
        }
        if (appearance?.skinColor && (matName.includes('skin') || matName.includes('body') || matName.includes('head'))) {
          if (node.material.color) node.material.color.set(appearance.skinColor);
        }
        if (appearance?.eyeColor && (matName.includes('eye') && !matName.includes('lash') && !matName.includes('brow'))) {
          if (node.material.color) node.material.color.set(appearance.eyeColor);
        }
        
        // Apply Glasses Visibility
        if (nodeName.includes('glass') || nodeName.includes('headwear') || matName.includes('glass')) {
          node.visible = appearance?.hasGlasses ?? false;
        }
        
        // Future: Handle multiple mesh visibility
        // if (hairMeshNames.size > 1 && nodeName.includes('hair_')) {
        //    node.visible = (appearance?.hairStyle === nodeName);
        // }
      }
    });

    if (onCapabilitiesLoaded) {
      onCapabilitiesLoaded({
        hasHumanoidRig,
        hasFacialMorphs,
        hasAnimations: allAnimations.length > 0,
        hasGlasses,
        hasHair,
        hasClothing,
        hasMultipleHairStyles: hairMeshNames.size > 1,
        hasMultipleOutfits: outfitMeshNames.size > 1,
        hasMultipleEyeStyles: eyeMeshNames.size > 1,
        hasHairColor,
        hasSkinColor,
        hasClothingColor,
        hasEyeColor
      });
    }
  }, [appearance, scene, allAnimations, onCapabilitiesLoaded]);

  const transform = appearance?.transform || { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5 };

  return (
    <group ref={groupRef} position={transform.position} rotation={transform.rotation} scale={[transform.scale, transform.scale, transform.scale]}>
      {showEmoji && currentEmoji && (
        <Html position={[0, 1.8, 0]} center className="pointer-events-none">
          <div className="animate-bounce-short text-4xl bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-xl">
            {currentEmoji}
          </div>
        </Html>
      )}
      <primitive object={scene} />
    </group>
  );
}

// Wrapper to handle dynamic GLB loading gracefully
export function Companion3D(props: Companion3DProps) {
  const [modelStatus, setModelStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [gltfData, setGltfData] = useState<any>(null);
  
  const baseAvatar = props.appearance?.baseAvatar || 'default';
  const character = CHARACTER_REGISTRY.find(c => c.id === baseAvatar) || CHARACTER_REGISTRY.find(c => c.id === 'default');
  const url = character ? character.model : '/avatar.glb';
  
  useEffect(() => {
    setModelStatus('loading');
    const loader = new GLTFLoader();
    
    loader.load(url, (gltf) => {
      setGltfData(gltf);
      setModelStatus('ready');
    }, undefined, () => {
      console.error(`Failed to load ${url}. Asset does not exist.`);
      setModelStatus('error');
    });
  }, [url]);

  if (modelStatus === 'loading') return null;
  
  if (modelStatus === 'error') {
     return (
       <group position={[0, 0, 0]}>
         <mesh>
           <boxGeometry args={[0.5, 0.5, 0.5]} />
           <meshBasicMaterial color="red" />
         </mesh>
         <Html center className="pointer-events-none w-64 text-center">
           <div className="bg-red-500/90 p-4 text-sm text-white rounded-xl shadow-xl backdrop-blur-md border border-white/20">
             <span className="font-bold block mb-1">Missing Avatar Asset</span>
             Please download <b>{url}</b> and place it in the `public/` directory.
           </div>
         </Html>
       </group>
     );
  }
  
  return <AvatarRenderer gltf={gltfData} {...props} />;
}
