import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRM,
} from "@pixiv/three-vrm";

import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";

export async function loadVRMA(
  url: string,
  vrm: VRM
): Promise<THREE.AnimationClip> {
  const loader = new GLTFLoader();

  loader.crossOrigin = "anonymous";

  loader.register(
    (parser) =>
      new VRMAnimationLoaderPlugin(parser)
  );

  return new Promise(
    (resolve, reject) => {
      loader.load(
        url,

        (gltf) => {
          const vrmAnimations =
            gltf.userData.vrmAnimations;

          if (
            !vrmAnimations ||
            vrmAnimations.length === 0
          ) {
            reject(
              new Error(
                `No VRMAnimation found in ${url}`
              )
            );
            return;
          }

          const clip =
            createVRMAnimationClip(
              vrmAnimations[0],
              vrm
            );

          if (!clip || clip.tracks.length === 0) {
            reject(
              new Error(
                `VRMA produced no animation tracks: ${url}`
              )
            );
            return;
          }

          resolve(clip);
        },

        undefined,

        (error) => {
          reject(error);
        }
      );
    }
  );
}