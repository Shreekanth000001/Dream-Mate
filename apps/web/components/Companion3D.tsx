"use client";

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Quaternion, Euler, AnimationMixer } from 'three';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { CHARACTER_REGISTRY } from '@/lib/characters';

export interface AvatarAppearance {
  baseAvatar?: string;
  voiceURI?: string;
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
}

interface Companion3DProps {
  emotion?: string;
  gesture?: string;
  emoji?: string;
  appearance?: AvatarAppearance;
  isSpeaking?: boolean;
  onCapabilitiesLoaded?: (caps: AvatarCapabilities) => void;
}

// Natural relaxed pose offsets from VRM T-pose (in radians)
const RELAXED_POSE: Record<string, { x: number; y: number; z: number }> = {
  spine:         { x: 0.0, y: 0.0, z: 0.0 },
  chest:         { x: 0.0, y: 0.0, z: 0.0 },
  head:          { x: 0.0, y: 0.0, z: 0.0 },
};

const ENABLE_IDLE_ARM_POSE = true;

const IDLE_POSE = {
  leftUpperArm:  new Euler(0, 0, -1.25, 'ZYX'),
  rightUpperArm: new Euler(0, 0,  1.25, 'ZYX'),
  // X axis bends the elbow. We try +0.25 (14 degrees). 
  leftLowerArm:  new Euler(0.25, 0, 0, 'ZYX'),
  rightLowerArm: new Euler(0.25, 0, 0, 'ZYX'),
  leftHand:      new Euler(0, 0, 0, 'ZYX'),
  rightHand:     new Euler(0, 0, 0, 'ZYX'),
};

const VRM_BONES = Object.keys(RELAXED_POSE) as Array<keyof typeof RELAXED_POSE>;

function AvatarRenderer({ 
  vrm, 
  mixer,
  emotion = 'neutral', 
  gesture = 'none', 
  emoji, 
  appearance, 
  isSpeaking = false,
  onCapabilitiesLoaded
}: Companion3DProps & { vrm: VRM, mixer: AnimationMixer | null }) {
  const groupRef = useRef<Group>(null);
  const bonesRef = useRef<Record<string, any>>({});
  const restPoseRef = useRef<Record<string, Quaternion>>({});
  const poseAppliedRef = useRef(false);

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
  }, [emoji, currentEmoji, showEmoji]);

  useEffect(() => {
    if (!vrm) return;
    
    if (onCapabilitiesLoaded) {
      onCapabilitiesLoaded({
        hasHumanoidRig: !!vrm.humanoid,
        hasFacialMorphs: !!vrm.expressionManager,
      });
    }
    
    if (vrm.humanoid) {
      const bones: Record<string, any> = {};
      const restPose: Record<string, Quaternion> = {};
      
      for (const boneName of VRM_BONES) {
        const node = vrm.humanoid.getNormalizedBoneNode(boneName as any);
        if (node) {
          bones[boneName] = node;
          // Store the original rest quaternion BEFORE we modify anything
          restPose[boneName] = node.quaternion.clone();
        }
      }
      
      bonesRef.current = bones;
      restPoseRef.current = restPose;
      poseAppliedRef.current = false;
      
      // Apply the relaxed pose immediately so the first frame isn't T-pose
      applyRelaxedPose(bones, restPose);
      poseAppliedRef.current = true;
    }
  }, [vrm, onCapabilitiesLoaded]);

  // Helper: apply relaxed pose using rest quaternion + offset
  function applyRelaxedPose(bones: Record<string, any>, restPose: Record<string, Quaternion>) {
    for (const boneName of VRM_BONES) {
      const node = bones[boneName];
      const rest = restPose[boneName];
      if (!node || !rest) continue;
      
      const offset = RELAXED_POSE[boneName];
      const offsetQuat = new Quaternion().setFromEuler(
        new Euler(offset.x, offset.y, offset.z, 'XYZ')
      );
      // Final = rest * offset
      node.quaternion.copy(rest).multiply(offsetQuat);
    }
  }

  useFrame((state, delta) => {
    if (!vrm) return;
    
    const lerpSpeed = Math.min(delta * 6, 1);
    const bones = bonesRef.current;
    const restPose = restPoseRef.current;
    
    if (vrm.expressionManager) {
      Object.values(VRMExpressionPresetName).forEach(name => {
        vrm.expressionManager!.setValue(name, 0);
      });
      
      let expr: VRMExpressionPresetName = VRMExpressionPresetName.Neutral;
      if (emotion === 'happy' || emotion === 'excited') expr = VRMExpressionPresetName.Happy;
      else if (emotion === 'sad') expr = VRMExpressionPresetName.Sad;
      else if (emotion === 'angry' || emotion === 'concerned') expr = VRMExpressionPresetName.Angry;
      else if (emotion === 'relaxed') expr = VRMExpressionPresetName.Relaxed;
      else if (emotion === 'surprised') expr = VRMExpressionPresetName.Surprised;
      
      vrm.expressionManager.setValue(expr, 1.0);
      
      if (isSpeaking) {
        const t = state.clock.elapsedTime;
        const aa = (Math.sin(t * 12) * 0.5 + 0.5) * 0.6;
        const oh = (Math.cos(t * 8) * 0.5 + 0.5) * 0.3;
        vrm.expressionManager.setValue(VRMExpressionPresetName.Aa, aa);
        vrm.expressionManager.setValue(VRMExpressionPresetName.Oh, oh);
      }
      
      vrm.expressionManager.update();
    }
    
    // 2. Procedural bone animation (offsets from relaxed pose)
    // Head: emotional tilts
    if (bones.head && restPose.head) {
      let hx = RELAXED_POSE.head.x;
      let hy = RELAXED_POSE.head.y;
      let hz = RELAXED_POSE.head.z;
      
      if (emotion === 'sad') hx += 0.12;
      else if (emotion === 'excited') hx -= 0.08;
      else if (emotion === 'thinking') { hy -= 0.15; hz -= 0.06; }
      else if (emotion === 'concerned') { hx += 0.06; hy += 0.06; }
      
      const targetQuat = new Quaternion().setFromEuler(new Euler(hx, hy, hz, 'XYZ'));
      const finalQuat = restPose.head.clone().multiply(targetQuat);
      bones.head.quaternion.slerp(finalQuat, lerpSpeed);
    }
    
    // Arms remain in their native rest pose.
    // Removed asymmetric speaking/thinking arm animations per requirements.
    
    if (ENABLE_IDLE_ARM_POSE) {
      const armBones = ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand'];
      for (const boneName of armBones) {
        const node = bones[boneName];
        const rest = restPose[boneName];
        if (node && rest) {
          const euler = IDLE_POSE[boneName as keyof typeof IDLE_POSE];
          if (euler) {
            const targetQuat = new Quaternion().setFromEuler(euler);
            const finalQuat = rest.clone().multiply(targetQuat);
            node.quaternion.slerp(finalQuat, lerpSpeed);
          }
        }
      }
    }
    
    // Left arm stays relaxed (no dynamic animation for left arm)
    // Already set by initial applyRelaxedPose, no per-frame changes needed.
    
    // 3. SpringBones (hair/clothing physics)
    if (vrm.springBoneManager) {
      vrm.springBoneManager.update(delta);
    }
    
    if (mixer) {
      mixer.update(delta);
    }
    
    vrm.update(delta);
  });

  const transform = appearance?.transform || { position: [0, -1.4, 0], rotation: [0, 0, 0], scale: 1.0 };

  return (
    <group ref={groupRef} position={transform.position} rotation={transform.rotation} scale={[transform.scale, transform.scale, transform.scale]}>
      {showEmoji && currentEmoji && (
        <Html position={[0, 1.8, 0]} center className="pointer-events-none">
          <div className="animate-bounce-short text-4xl bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-xl">
            {currentEmoji}
          </div>
        </Html>
      )}
      <primitive object={vrm.scene} />
    </group>
  );
}

// Wrapper to handle dynamic VRM loading
export function Companion3D(props: Companion3DProps) {
  const [modelStatus, setModelStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [mixer, setMixer] = useState<AnimationMixer | null>(null);
  const [errorUrl, setErrorUrl] = useState('');
  const prevUrlRef = useRef<string>('');
  
  const baseAvatar = props.appearance?.baseAvatar || 'boy';
  const character = CHARACTER_REGISTRY.find(c => c.id === baseAvatar);
  // No silent fallback: if character not found, we will show an error
  const url = character ? character.model : '';
  
  useEffect(() => {
    if (!url) {
      setErrorUrl(`Unknown character: ${baseAvatar}`);
      setModelStatus('error');
      return;
    }
    
    // Skip if same URL already loaded
    if (url === prevUrlRef.current && vrm) return;
    prevUrlRef.current = url;
    
    setModelStatus('loading');
    
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => new VRMLoaderPlugin(parser));
    
    console.log(`[VRM Loader] Starting load for URL: ${url}`);
    
    loader.load(
       url, 
       (gltf) => {
          console.log(`[VRM Loader] GLTF loaded successfully from ${url}`, gltf);
          const loadedVrm = gltf.userData.vrm as VRM;
          if (!loadedVrm) {
            console.error(`[VRM Loader] File loaded but no VRM data found in userData for ${url}`);
            setErrorUrl(url);
            setModelStatus('error');
            return;
          }
          
          console.log(`[VRM Loader] VRM loaded successfully`, loadedVrm);
          console.log(`[VRM Loader] VRM scene children count:`, loadedVrm.scene.children.length);
          console.log(`[VRM Loader] VRM humanoid available:`, !!loadedVrm.humanoid);
          
          // Disable frustum culling
          loadedVrm.scene.traverse((obj) => {
             obj.frustumCulled = false;
          });
          
          // Cleanup previous VRM
          if (vrm) {
            vrm.scene.traverse((obj: any) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m: any) => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
          }
          
          // Check for native idle animation
          let newMixer: AnimationMixer | null = null;
          if (gltf.animations && gltf.animations.length > 0) {
            const clipNames = gltf.animations.map(a => a.name).join(', ');
            console.log(`[VRM Loader] Found ${gltf.animations.length} native animations: ${clipNames}. Playing the first one.`);
            newMixer = new AnimationMixer(loadedVrm.scene);
            const action = newMixer.clipAction(gltf.animations[0]);
            action.play();
          } else {
            console.log(`[VRM Loader] VRM has no idle animation (No animations found in GLTF).`);
          }
          
          setVrm(loadedVrm);
          setMixer(newMixer);
          setModelStatus('ready');
       }, 
       (progress) => {
          console.log(`[VRM Loader] Progress for ${url}:`, progress.loaded, '/', progress.total);
       }, 
       (error) => {
          console.error(`[VRM Loader] Failed to load VRM ${url}:`);
          console.error(error);
          if (error instanceof Error) {
            console.error("Stack trace:", error.stack);
          }
          setErrorUrl(url);
          setModelStatus('error');
       }
    );
  }, [url]);

  if (modelStatus === 'loading') {
    return (
      <Html center className="pointer-events-none">
        <div className="text-white text-sm bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md">
          Loading avatar...
        </div>
      </Html>
    );
  }
  
  if (modelStatus === 'error' || !vrm) {
     return (
       <group position={[0, 0, 0]}>
         <Html center className="pointer-events-none w-64 text-center">
           <div className="bg-red-500/90 p-4 text-sm text-white rounded-xl shadow-xl backdrop-blur-md border border-white/20">
             <span className="font-bold block mb-1">Avatar Load Error</span>
             Could not load <b>{errorUrl}</b>.
           </div>
         </Html>
       </group>
     );
  }
  
  return <AvatarRenderer vrm={vrm} mixer={mixer} {...props} />;
}
