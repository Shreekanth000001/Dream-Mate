"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  Group,
  AnimationMixer,
  AnimationAction,
  AnimationClip,
  Object3D,
  Mesh,
  Material,
} from "three";

import { Html } from "@react-three/drei";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  VRMLoaderPlugin,
  VRM,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";

import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";

import { CHARACTER_REGISTRY } from "@/lib/characters";


// ============================================================
// TYPES
// ============================================================

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

  onCapabilitiesLoaded?: (
    caps: AvatarCapabilities
  ) => void;
}


// ============================================================
// VRMA ANIMATIONS
// ============================================================

const ANIMATION_PATHS: Record<string, string> = {
  wave: "/characters/animations/wave.vrma",
  sad: "/characters/animations/sad.vrma",
};


// ============================================================
// AVATAR RENDERER
// ============================================================

function AvatarRenderer({
  vrm,
  mixer,
  emotion = "neutral",
  gesture = "none",
  emoji,
  appearance,
  isSpeaking = false,
  onCapabilitiesLoaded,
}: Companion3DProps & {
  vrm: VRM;
  mixer: AnimationMixer | null;
}) {
  const groupRef = useRef<Group>(null);

  const animationActionRef =
    useRef<AnimationAction | null>(null);

  const animationClipRef =
    useRef<AnimationClip | null>(null);

  const animationPlayingRef =
    useRef(false);

  const animationLoaderRef =
    useRef<GLTFLoader | null>(null);

    const playAnimationRef =
  useRef<((name: string) => void) | null>(null);


  // ==========================================================
  // EMOJI
  // ==========================================================

  const [showEmoji, setShowEmoji] =
    useState(false);

  const [currentEmoji, setCurrentEmoji] =
    useState(emoji);


  useEffect(() => {
    if (!emoji) {
      return;
    }

    setCurrentEmoji(emoji);
    setShowEmoji(true);

    const timer = setTimeout(() => {
      setShowEmoji(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [emoji]);


  // ==========================================================
  // CAPABILITIES
  // ==========================================================

  useEffect(() => {
    if (!vrm) {
      return;
    }

    onCapabilitiesLoaded?.({
      hasHumanoidRig: !!vrm.humanoid,
      hasFacialMorphs: !!vrm.expressionManager,
    });
  }, [
    vrm,
    onCapabilitiesLoaded,
  ]);


  // ==========================================================
  // LOAD + PLAY VRMA
  // ==========================================================

useEffect(() => {
  if (!vrm || !mixer) {
    return;
  }

  const playAnimation = (animationName: string) => {
    const animationUrl = ANIMATION_PATHS[animationName];

    if (!animationUrl) {
      console.error(
        `[Animation] No animation registered for ${animationName}`
      );
      return;
    }

    console.log(
      `[Animation] Loading VRMA ${animationName} from ${animationUrl}`
    );

    // --------------------------------------------------------
    // STOP CURRENT ANIMATION
    // --------------------------------------------------------

    if (animationActionRef.current) {
      animationActionRef.current.stop();
      animationActionRef.current.reset();
      animationActionRef.current = null;
    }

    mixer.stopAllAction();

    animationPlayingRef.current = false;

    // --------------------------------------------------------
    // CREATE VRMA LOADER
    // --------------------------------------------------------

    const loader = new GLTFLoader();

    loader.crossOrigin = "anonymous";

    loader.register(
      (parser) =>
        new VRMAnimationLoaderPlugin(parser)
    );

    animationLoaderRef.current = loader;

    // --------------------------------------------------------
    // LOAD VRMA
    // --------------------------------------------------------

    loader.load(
      animationUrl,

      (gltf) => {
        console.log(
          `[Animation] VRMA loaded: ${animationUrl}`
        );

        console.log(
          "[Animation] VRMA userData:",
          gltf.userData
        );

        const vrmAnimations =
          gltf.userData.vrmAnimations;

        if (
          !vrmAnimations ||
          vrmAnimations.length === 0
        ) {
          console.error(
            "[Animation] No VRM animations found in VRMA"
          );

          return;
        }

        const vrmAnimation =
          vrmAnimations[0];

        console.log(
          `[Animation] Found VRMAnimation for ${animationName}`,
          vrmAnimation
        );

        // ----------------------------------------------------
        // VRMA -> THREE ANIMATION CLIP
        // ----------------------------------------------------

        const clip =
          createVRMAnimationClip(
            vrmAnimation,
            vrm
          );

        if (!clip) {
          console.error(
            `[Animation] Failed to create AnimationClip for ${animationName}`
          );

          return;
        }

        console.log(
          `[Animation] Created clip for ${animationName}:`,
          {
            name: clip.name,
            duration: clip.duration,
            tracks: clip.tracks.length,
          }
        );

        animationClipRef.current = clip;

        // ----------------------------------------------------
        // CREATE ACTION
        // ----------------------------------------------------

        const action =
          mixer.clipAction(
            clip,
            vrm.scene
          );

        action.reset();

        action.setLoop(
          THREE.LoopOnce,
          1
        );

        action.clampWhenFinished = true;

        action.fadeIn(0.1);

        animationActionRef.current = action;

        animationPlayingRef.current = true;

        // ----------------------------------------------------
        // FINISHED
        // ----------------------------------------------------

        const handleFinished = (
          event: THREE.Event
        ) => {
          const finishedEvent =
            event as THREE.Event & {
              action?: AnimationAction;
            };

          // Ignore finished events belonging
          // to another animation.
          if (
            finishedEvent.action !== action
          ) {
            return;
          }

          mixer.removeEventListener(
            "finished",
            handleFinished
          );

          animationPlayingRef.current =
            false;

          if (
            animationActionRef.current ===
            action
          ) {
            animationActionRef.current =
              null;
          }

          console.log(
            `[Animation] Finished ${animationName}`
          );

          // ==================================================
          // TEST CHAIN:
          //
          // wave -> wait 1 second -> sad
          // ==================================================

          if (
            animationName === "wave"
          ) {
            console.log(
              "[Animation] Wave finished. Playing sad in 1 second..."
            );

            setTimeout(() => {
              playAnimation("sad");
            }, 1000);
          }
        };

        mixer.addEventListener(
          "finished",
          handleFinished
        );

        // ----------------------------------------------------
        // PLAY
        // ----------------------------------------------------

        action.play();

        console.log(
          `[Animation] Playing VRMA ${animationName}, duration: ${clip.duration}s`
        );
      },

      // ------------------------------------------------------
      // PROGRESS
      // ------------------------------------------------------

      (progress) => {
        if (progress.total > 0) {
          console.log(
            `[Animation] ${animationName} loading: ${
              Math.round(
                (progress.loaded /
                  progress.total) *
                  100
              )
            }%`
          );
        }
      },

      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      (error) => {
        console.error(
          `[Animation] Failed to load VRMA ${animationUrl}`,
          error
        );
      }
    );
  };

  // Make the function available to the rest
  // of the component.
  playAnimationRef.current =
    playAnimation;

  // ----------------------------------------------------------
  // START INITIAL GESTURE
  // ----------------------------------------------------------

  if (gesture !== "none") {
    playAnimation(gesture);
  }

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  return () => {
    playAnimationRef.current = null;

    animationPlayingRef.current = false;

    if (animationActionRef.current) {
      animationActionRef.current.stop();
      animationActionRef.current.reset();
      animationActionRef.current = null;
    }

    mixer.stopAllAction();

    animationClipRef.current = null;
  };
}, [
  vrm,
  mixer,
  gesture,
]);


  // ==========================================================
  // FRAME LOOP
  // ==========================================================

  useFrame(
    (
      state,
      delta
    ) => {

      if (!vrm) {
        return;
      }


      // --------------------------------------------------------
      // EXPRESSIONS
      // --------------------------------------------------------

      if (vrm.expressionManager) {

        Object.values(
          VRMExpressionPresetName
        ).forEach(
          (name) => {
            vrm.expressionManager!.setValue(
              name,
              0
            );
          }
        );


        let expression =
          VRMExpressionPresetName.Neutral;


        if (
          emotion === "happy" ||
          emotion === "excited"
        ) {
          expression =
            VRMExpressionPresetName.Happy;

        } else if (
          emotion === "sad"
        ) {
          expression =
            VRMExpressionPresetName.Sad;

        } else if (
          emotion === "angry" ||
          emotion === "concerned"
        ) {
          expression =
            VRMExpressionPresetName.Angry;

        } else if (
          emotion === "relaxed"
        ) {
          expression =
            VRMExpressionPresetName.Relaxed;

        } else if (
          emotion === "surprised"
        ) {
          expression =
            VRMExpressionPresetName.Surprised;
        }


        vrm.expressionManager.setValue(
          expression,
          1
        );


        // ------------------------------------------------------
        // SPEAKING
        // ------------------------------------------------------

        if (isSpeaking) {

          const t =
            state.clock.elapsedTime;


          const aa =
            (
              Math.sin(
                t * 12
              ) *
                0.5 +
              0.5
            ) *
            0.6;


          const oh =
            (
              Math.cos(
                t * 8
              ) *
                0.5 +
              0.5
            ) *
            0.3;


          vrm.expressionManager.setValue(
            VRMExpressionPresetName.Aa,
            aa
          );


          vrm.expressionManager.setValue(
            VRMExpressionPresetName.Oh,
            oh
          );
        }


        vrm.expressionManager.update();
      }


      // --------------------------------------------------------
      // SPRING BONES
      // --------------------------------------------------------

      if (vrm.springBoneManager) {
        vrm.springBoneManager.update(
          delta
        );
      }


      // --------------------------------------------------------
      // ANIMATION MIXER
      // --------------------------------------------------------

      if (mixer) {
        mixer.update(delta);
      }


      // --------------------------------------------------------
      // VRM UPDATE
      // --------------------------------------------------------

      vrm.update(delta);
    }
  );


  // ==========================================================
  // TRANSFORM
  // ==========================================================

  const transform =
    appearance?.transform ?? {
      position: [0, -1.4, 0] as [
        number,
        number,
        number
      ],

      rotation: [0, 0, 0] as [
        number,
        number,
        number
      ],

      scale: 1,
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <group
      ref={groupRef}
      position={transform.position}
      rotation={transform.rotation}
      scale={[
        transform.scale,
        transform.scale,
        transform.scale,
      ]}
    >

      {showEmoji &&
        currentEmoji && (

          <Html
            position={[
              0,
              1.8,
              0,
            ]}
            center
            className="pointer-events-none"
          >

            <div className="animate-bounce-short text-4xl bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-xl">
              {currentEmoji}
            </div>

          </Html>
        )}


      <primitive
        object={vrm.scene}
      />

    </group>
  );
}


// ============================================================
// VRM LOADER WRAPPER
// ============================================================

export function Companion3D(
  props: Companion3DProps
) {

  const [
    modelStatus,
    setModelStatus,
  ] = useState<
    "loading" | "ready" | "error"
  >("loading");


  const [
    vrm,
    setVrm,
  ] = useState<VRM | null>(null);


  const [
    mixer,
    setMixer,
  ] =
    useState<AnimationMixer | null>(
      null
    );


  const [
    errorUrl,
    setErrorUrl,
  ] = useState("");


  const prevUrlRef =
    useRef<string>("");


  const baseAvatar =
    props.appearance?.baseAvatar ||
    "boy";


  const character =
    CHARACTER_REGISTRY.find(
      (c) =>
        c.id === baseAvatar
    );


  const url =
    character
      ? character.model
      : "";


  const vrmRef =
    useRef<VRM | null>(null);


  // ==========================================================
  // LOAD VRM
  // ==========================================================

  useEffect(() => {

    if (!url) {

      queueMicrotask(() => {

        setErrorUrl(
          `Unknown character: ${baseAvatar}`
        );

        setModelStatus(
          "error"
        );

      });

      return;
    }


    if (
      url ===
        prevUrlRef.current &&
      vrmRef.current
    ) {
      return;
    }


    prevUrlRef.current =
      url;


    setModelStatus(
      "loading"
    );


    // --------------------------------------------------------
    // VRM LOADER
    // --------------------------------------------------------

    const loader =
      new GLTFLoader();

    loader.crossOrigin =
      "anonymous";


    /*
     * This loader handles the VRM model.
     *
     * We DO NOT register the VRMA plugin here
     * because the animation loader is separate.
     */

    loader.register(
      (parser) =>
        new VRMLoaderPlugin(
          parser
        )
    );


    console.log(
      `[VRM Loader] Starting load for URL: ${url}`
    );


    loader.load(
      url,


      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      (gltf) => {

        console.log(
          `[VRM Loader] GLTF loaded successfully from ${url}`
        );


        const loadedVrm =
          gltf.userData.vrm as VRM;


        if (!loadedVrm) {

          console.error(
            `[VRM Loader] No VRM data found in ${url}`
          );

          setErrorUrl(url);

          setModelStatus(
            "error"
          );

          return;
        }


        console.log(
          "[VRM Loader] VRM loaded successfully"
        );


        console.log(
          "[VRM Loader] Humanoid:",
          !!loadedVrm.humanoid
        );


        // ----------------------------------------------------
        // DISABLE FRUSTUM CULLING
        // ----------------------------------------------------

        loadedVrm.scene.traverse(
          (obj) => {
            obj.frustumCulled =
              false;
          }
        );


        // ----------------------------------------------------
        // CLEAN OLD VRM
        // ----------------------------------------------------

        if (
          vrmRef.current
        ) {

          vrmRef.current.scene.traverse(
            (
              obj: Object3D
            ) => {

              const mesh =
                obj as Mesh;


              if (
                mesh.geometry
              ) {
                mesh.geometry.dispose();
              }


              if (
                mesh.material
              ) {

                if (
                  Array.isArray(
                    mesh.material
                  )
                ) {

                  mesh.material.forEach(
                    (
                      m: Material
                    ) =>
                      m.dispose()
                  );

                } else {

                  mesh.material.dispose();

                }
              }
            }
          );
        }


        // ----------------------------------------------------
        // MIXER
        // ----------------------------------------------------

        const newMixer =
          new AnimationMixer(
            loadedVrm.scene
          );


        // ----------------------------------------------------
        // STORE
        // ----------------------------------------------------

        vrmRef.current =
          loadedVrm;


        setVrm(
          loadedVrm
        );


        setMixer(
          newMixer
        );


        setModelStatus(
          "ready"
        );
      },


      // ------------------------------------------------------
      // PROGRESS
      // ------------------------------------------------------

      (progress) => {

        console.log(
          `[VRM Loader] Progress for ${url}:`,
          progress.loaded,
          "/",
          progress.total
        );

      },


      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      (error) => {

        console.error(
          `[VRM Loader] Failed to load VRM ${url}`
        );

        console.error(error);

        setErrorUrl(url);

        setModelStatus(
          "error"
        );

      }
    );

  }, [
    url,
    baseAvatar,
  ]);


  // ==========================================================
  // LOADING UI
  // ==========================================================

  if (
    modelStatus ===
    "loading"
  ) {

    return (

      <Html
        center
        className="pointer-events-none"
      >

        <div className="text-white text-sm bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md">
          Loading avatar...
        </div>

      </Html>
    );
  }


  // ==========================================================
  // ERROR UI
  // ==========================================================

  if (
    modelStatus === "error" ||
    !vrm
  ) {

    return (

      <group
        position={[
          0,
          0,
          0,
        ]}
      >

        <Html
          center
          className="pointer-events-none w-64 text-center"
        >

          <div className="bg-red-500/90 p-4 text-sm text-white rounded-xl shadow-xl backdrop-blur-md border border-white/20">

            <span className="font-bold block mb-1">
              Avatar Load Error
            </span>

            Could not load{" "}

            <b>
              {errorUrl}
            </b>

            .

          </div>

        </Html>

      </group>
    );
  }


  // ==========================================================
  // AVATAR
  // ==========================================================

  return (

    <AvatarRenderer
      vrm={vrm}
      mixer={mixer}
      {...props}
    />

  );
}
