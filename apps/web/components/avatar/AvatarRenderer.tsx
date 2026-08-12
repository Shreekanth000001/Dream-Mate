"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Group } from "three";
import { Html } from "@react-three/drei";
import { VRM } from "@pixiv/three-vrm";

import {
  updateAvatarExpressions,
} from "./AvatarExpressions";

import {
  AnimationController,
} from "./animation/AnimationController";

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

export interface AvatarRenderProps {
  vrm: VRM;

  animationController:
    | AnimationController
    | null;

  emotion?: string;
  gesture?: string;
  emoji?: string;
  appearance?: AvatarAppearance;
  isSpeaking?: boolean;

  onCapabilitiesLoaded?: (
    caps: AvatarCapabilities
  ) => void;
}

export function AvatarRender({
  vrm,
  animationController,
  emotion = "neutral",
  gesture = "none",
  emoji,
  appearance,
  isSpeaking = false,
  onCapabilitiesLoaded,
}: AvatarRenderProps) {
  const groupRef =
    useRef<Group>(null);

  const previousGestureRef =
    useRef("none");

  const [
    showEmoji,
    setShowEmoji,
  ] = useState(false);

  const [
    currentEmoji,
    setCurrentEmoji,
  ] = useState<
    string | undefined
  >(emoji);

  /*
   * ----------------------------------------------------------
   * Capabilities
   * ----------------------------------------------------------
   */

  useEffect(() => {
    onCapabilitiesLoaded?.({
      hasHumanoidRig:
        !!vrm.humanoid,

      hasFacialMorphs:
        !!vrm.expressionManager,
    });
  }, [
    vrm,
    onCapabilitiesLoaded,
  ]);

  /*
   * ----------------------------------------------------------
   * Emoji
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!emoji) {
      return;
    }

    setCurrentEmoji(
      emoji
    );

    setShowEmoji(
      true
    );

    const timer =
      window.setTimeout(() => {
        setShowEmoji(false);
      }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [emoji]);

  /*
   * ----------------------------------------------------------
   * Gesture requests
   * ----------------------------------------------------------
   *
   * Every time the gesture prop changes,
   * ask the controller to play it.
   */

  useEffect(() => {
    if (!animationController) {
      return;
    }

    if (
      gesture ===
      previousGestureRef.current
    ) {
      return;
    }

    previousGestureRef.current =
      gesture;

    if (
      gesture === "none"
    ) {
      return;
    }

    const avatarId =
      appearance?.baseAvatar ===
      "girl"
        ? "girl"
        : "boy";

    void animationController.play(
      gesture,
      avatarId
    );
  }, [
    gesture,
    animationController,
    appearance?.baseAvatar,
  ]);

  /*
   * ----------------------------------------------------------
   * Frame loop
   * ----------------------------------------------------------
   */

  useFrame(
    (state, delta) => {
      /*
       * Expressions.
       */
      updateAvatarExpressions(
        vrm,
        emotion,
        isSpeaking,
        state.clock.elapsedTime
      );

      /*
       * Spring bones.
       */
      if (
        vrm.springBoneManager
      ) {
        vrm.springBoneManager.update(
          delta
        );
      }

      /*
       * Animation.
       *
       * The controller owns the mixer.
       */
      animationController?.update(
        delta
      );

      /*
       * VRM update.
       */
      vrm.update(delta);
    }
  );

  /*
   * ----------------------------------------------------------
   * Transform
   * ----------------------------------------------------------
   */

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

  /*
   * ----------------------------------------------------------
   * Render
   * ----------------------------------------------------------
   */

  return (
    <group
      ref={groupRef}
      position={
        transform.position
      }
      rotation={
        transform.rotation
      }
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
              {
                currentEmoji
              }
            </div>
          </Html>
        )}

      <primitive
        object={vrm.scene}
      />
    </group>
  );
}