import {
  VRM,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";

export function updateAvatarExpressions(
  vrm: VRM,
  emotion: string,
  isSpeaking: boolean,
  timeSeconds: number
): void {
  const manager = vrm.expressionManager;

  if (!manager) {
    return;
  }

  /*
   * Reset preset expressions.
   */
  Object.values(VRMExpressionPresetName).forEach(
    (name) => {
      manager.setValue(name, 0);
    }
  );

  /*
   * Emotion.
   */
  let expression =
    VRMExpressionPresetName.Neutral;

  switch (emotion) {
    case "happy":
    case "excited":
      expression =
        VRMExpressionPresetName.Happy;
      break;

    case "sad":
      expression =
        VRMExpressionPresetName.Sad;
      break;

    case "angry":
    case "concerned":
      expression =
        VRMExpressionPresetName.Angry;
      break;

    case "relaxed":
      expression =
        VRMExpressionPresetName.Relaxed;
      break;

    case "surprised":
      expression =
        VRMExpressionPresetName.Surprised;
      break;

    default:
      expression =
        VRMExpressionPresetName.Neutral;
      break;
  }

  manager.setValue(
    expression,
    1
  );

  /*
   * Simple speaking animation.
   */
  if (isSpeaking) {
    const aa =
      (
        Math.sin(
          timeSeconds * 12
        ) *
          0.5 +
        0.5
      ) *
      0.6;

    const oh =
      (
        Math.cos(
          timeSeconds * 8
        ) *
          0.5 +
        0.5
      ) *
      0.3;

    manager.setValue(
      VRMExpressionPresetName.Aa,
      aa
    );

    manager.setValue(
      VRMExpressionPresetName.Oh,
      oh
    );
  }

  manager.update();
}