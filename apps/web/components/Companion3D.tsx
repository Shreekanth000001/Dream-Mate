"use client";

import {useEffect,useRef,useState,} from "react";

import { Html } from "@react-three/drei";

import * as THREE from "three";

import { AnimationMixer,Object3D,Mesh,Material,} from "three";

import {GLTFLoader,} from "three/examples/jsm/loaders/GLTFLoader.js";

import {VRMLoaderPlugin,VRM,} from "@pixiv/three-vrm";

import {
  CHARACTER_REGISTRY,
} from "@/lib/characters";

import {AvatarRender,AvatarAppearance,AvatarCapabilities} from "./avatar/AvatarRenderer";

import {
  AnimationController,
} from "./avatar/animation/AnimationController";

export interface Companion3DProps {
  emotion?: string;
  gesture?: string;
  emoji?: string;
  appearance?: AvatarAppearance;
  isSpeaking?: boolean;

  onCapabilitiesLoaded?: (
    caps: AvatarCapabilities
  ) => void;
}

export function Companion3D(
  props: Companion3DProps
) {
  const [
    modelStatus,
    setModelStatus,
  ] = useState<
    "loading" |
    "ready" |
    "error"
  >("loading");

  const [
    vrm,
    setVrm,
  ] = useState<VRM | null>(
    null
  );

  const [
    animationController,
    setAnimationController,
  ] =
    useState<AnimationController | null>(
      null
    );

  const [
    errorUrl,
    setErrorUrl,
  ] = useState("");

  const prevUrlRef =
    useRef<string>("");

  const vrmRef =
    useRef<VRM | null>(null);

  const mixerRef =
    useRef<AnimationMixer | null>(
      null
    );

  const controllerRef =
    useRef<
      AnimationController | null
    >(null);

  /*
   * ----------------------------------------------------------
   * Character
   * ----------------------------------------------------------
   */

  const baseAvatar =
    props.appearance
      ?.baseAvatar ??
    "boy";

  const character =
    CHARACTER_REGISTRY.find(
      (entry) =>
        entry.id ===
        baseAvatar
    );

  const url =
    character?.model ??
    "";

  /*
   * ----------------------------------------------------------
   * Load VRM
   * ----------------------------------------------------------
   */

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

    /*
     * Avoid reloading the same VRM.
     */

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

    const loader =
      new GLTFLoader();

    loader.crossOrigin =
      "anonymous";

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

      /*
       * --------------------------------------------------------
       * Success
       * --------------------------------------------------------
       */

      (gltf) => {
        console.log(
          `[VRM Loader] GLTF loaded successfully from ${url}`
        );

        const loadedVrm =
          gltf.userData
            .vrm as VRM;

        if (!loadedVrm) {
          console.error(
            `[VRM Loader] No VRM data found in ${url}`
          );

          setErrorUrl(
            url
          );

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

        /*
         * ------------------------------------------------------
         * Frustum culling
         * ------------------------------------------------------
         */

        loadedVrm.scene.traverse(
          (object) => {
            object.frustumCulled =
              false;
          }
        );

        /*
         * ------------------------------------------------------
         * Dispose previous VRM
         * ------------------------------------------------------
         */

        if (
          vrmRef.current
        ) {
          vrmRef.current.scene.traverse(
            (
              object: Object3D
            ) => {
              const mesh =
                object as Mesh;

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
                      material: Material
                    ) => {
                      material.dispose();
                    }
                  );
                } else {
                  mesh.material.dispose();
                }
              }
            }
          );
        }

        /*
         * ------------------------------------------------------
         * Mixer
         * ------------------------------------------------------
         */

        const mixer =
          new AnimationMixer(
            loadedVrm.scene
          );

        mixerRef.current =
          mixer;

        /*
         * ------------------------------------------------------
         * Animation controller
         * ------------------------------------------------------
         */

        const controller =
          new AnimationController(
            loadedVrm,
            mixer
          );

        controllerRef.current =
          controller;

        /*
         * ------------------------------------------------------
         * Store VRM
         * ------------------------------------------------------
         */

        vrmRef.current =
          loadedVrm;

        setVrm(
          loadedVrm
        );

        setAnimationController(
          controller
        );

        setModelStatus(
          "ready"
        );

        /*
         * ------------------------------------------------------
         * Start idle immediately.
         * ------------------------------------------------------
         */

        const avatarId =
          baseAvatar ===
          "girl"
            ? "girl"
            : "boy";

        void controller.startIdle(
          avatarId
        );
      },

      /*
       * --------------------------------------------------------
       * Progress
       * --------------------------------------------------------
       */

      (progress) => {
        if (
          progress.total > 0
        ) {
          console.log(
            `[VRM Loader] Progress for ${url}:`,
            `${Math.round(
              (progress.loaded /
                progress.total) *
                100
            )}%`
          );
        }
      },

      /*
       * --------------------------------------------------------
       * Error
       * --------------------------------------------------------
       */

      (error) => {
        console.error(
          `[VRM Loader] Failed to load VRM ${url}`
        );

        console.error(
          error
        );

        setErrorUrl(
          url
        );

        setModelStatus(
          "error"
        );
      }
    );

    /*
     * ----------------------------------------------------------
     * Cleanup
     * ----------------------------------------------------------
     */

    return () => {
      /*
       * Don't dispose the currently loaded VRM merely
       * because React re-runs the effect in development.
       *
       * The next successful load handles replacement.
       */
    };
  }, [
    url,
    baseAvatar,
  ]);

  /*
   * ----------------------------------------------------------
   * Loading
   * ----------------------------------------------------------
   */

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

  /*
   * ----------------------------------------------------------
   * Error
   * ----------------------------------------------------------
   */

  if (
    modelStatus ===
      "error" ||
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

  /*
   * ----------------------------------------------------------
   * Avatar
   * ----------------------------------------------------------
   */

  return (
    <AvatarRender
      vrm={vrm}
      animationController={
        animationController
      }
      {...props}
    />
  );
}