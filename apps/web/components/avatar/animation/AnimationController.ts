import * as THREE from "three";
import { VRM } from "@pixiv/three-vrm";

import {
  ANIMATIONS,
  canUseAnimation,
  AvatarId,
} from "./animationRegistry";

import { loadVRMA } from "./vrmaLoader";

export class AnimationController {
  private vrm: VRM;
  private mixer: THREE.AnimationMixer;

  private clips =
    new Map<string, THREE.AnimationClip>();

  private actions =
    new Map<string, THREE.AnimationAction>();

  private currentGesture: string | null = null;

  private idleAction: THREE.AnimationAction | null = null;

  private generation = 0;

  constructor(
    vrm: VRM,
    mixer: THREE.AnimationMixer
  ) {
    this.vrm = vrm;
    this.mixer = mixer;
  }

  async preload(
    animationIds: string[]
  ): Promise<void> {
    for (const id of animationIds) {
      await this.loadClip(id);
    }
  }

  private async loadClip(
    animationId: string
  ): Promise<THREE.AnimationClip> {
    const existing =
      this.clips.get(animationId);

    if (existing) {
      return existing;
    }

    const definition =
      ANIMATIONS[animationId];

    if (!definition) {
      throw new Error(
        `Unknown animation: ${animationId}`
      );
    }

    const clip = await loadVRMA(
      definition.file,
      this.vrm
    );

    this.clips.set(
      animationId,
      clip
    );

    return clip;
  }

  private getAction(
    animationId: string
  ): THREE.AnimationAction | null {
    const clip =
      this.clips.get(animationId);

    if (!clip) {
      return null;
    }

    let action =
      this.actions.get(animationId);

    if (!action) {
      action =
        this.mixer.clipAction(
          clip,
          this.vrm.scene
        );

      this.actions.set(
        animationId,
        action
      );
    }

    return action;
  }

  async startIdle(
    avatar: AvatarId
  ): Promise<void> {
    if (
      !canUseAnimation(
        "idle",
        avatar
      )
    ) {
      return;
    }

    await this.loadClip("idle");

    const idle =
      this.getAction("idle");

    if (!idle) {
      return;
    }

    if (
      this.idleAction === idle &&
      idle.isRunning()
    ) {
      return;
    }

    idle.reset();

    idle.setLoop(
      THREE.LoopRepeat,
      Infinity
    );

    idle.clampWhenFinished = false;

    idle.fadeIn(0.2);
    idle.play();

    this.idleAction = idle;
  }

  async playGesture(
    animationId: string,
    avatar: AvatarId
  ): Promise<void> {
    if (
      animationId === "idle"
    ) {
      return;
    }

    if (
      !canUseAnimation(
        animationId,
        avatar
      )
    ) {
      console.warn(
        `[Animation] ${animationId} is not available for ${avatar}`
      );
      return;
    }

    const requestId =
      ++this.generation;

    await this.loadClip(
      animationId
    );

    if (
      requestId !== this.generation
    ) {
      return;
    }

    const gesture =
      this.getAction(animationId);

    if (!gesture) {
      return;
    }

    /*
     * Fade idle out.
     */

    if (
      this.idleAction &&
      this.idleAction !== gesture
    ) {
      this.idleAction.fadeOut(
        0.2
      );
    }

    /*
     * Stop any previous gesture.
     */

    if (this.currentGesture) {
      const previous =
        this.actions.get(
          this.currentGesture
        );

      if (
        previous &&
        previous !== gesture
      ) {
        previous.stop();
      }
    }

    this.currentGesture =
      animationId;

    /*
     * Gesture plays once.
     */

    gesture.enabled = true;

    gesture.reset();

    gesture.setLoop(
      THREE.LoopOnce,
      1
    );

    gesture.clampWhenFinished =
      true;

    gesture.fadeIn(0.15);
    gesture.play();

    /*
     * Wait for THIS specific action
     * to finish.
     */

    const handleFinished = (event: THREE.Event) => {
    if (event.type !== "finished") {
        return;
    }

    const finishedEvent =
        event as THREE.Event & {
            action?: THREE.AnimationAction;
        };

    if (finishedEvent.action !== gesture) {
        return;
    }

    this.mixer.removeEventListener(
        "finished",
        handleFinished
    );

    /*
     * IMPORTANT:
     * Remove the finished gesture completely.
     * Do not leave it clamped at its last pose.
     */
    gesture.stop();
    gesture.reset();
    gesture.enabled = false;

    if (this.currentGesture === animationId) {
        this.currentGesture = null;
    }

    /*
     * Restore the idle animation from the beginning.
     */
    this.returnToIdle();
};

    this.mixer.addEventListener(
      "finished",
      handleFinished
    );
  }

  private returnToIdle(): void {
    if (!this.idleAction) {
        return;
    }

    /*
     * Make absolutely sure every gesture has released
     * control before idle takes over.
     */
    for (const [
        id,
        action,
    ] of this.actions) {
        if (
            id !== "idle" &&
            action !== this.idleAction
        ) {
            action.stop();
            action.reset();
            action.enabled = false;
        }
    }

    const idle = this.idleAction;

    idle.enabled = true;
    idle.stop();
    idle.reset();

    idle.setLoop(
        THREE.LoopRepeat,
        Infinity
    );

    idle.clampWhenFinished = false;

    idle.fadeIn(0.2);
    idle.play();
}

  async play(
    animationId: string,
    avatar: AvatarId
  ): Promise<void> {
    if (
      animationId === "idle"
    ) {
      await this.startIdle(
        avatar
      );
      return;
    }

    await this.playGesture(
      animationId,
      avatar
    );
  }

 stopAll(): void {
    ++this.generation;

    for (const action of this.actions.values()) {
        action.stop();
        action.reset();
        action.enabled = false;
    }

    this.mixer.stopAllAction();

    this.currentGesture = null;
    this.idleAction = null;
}

  update(
    delta: number
  ): void {
    this.mixer.update(delta);
  }

  dispose(): void {
    this.stopAll();

    this.clips.clear();
    this.actions.clear();
  }
}