export type AvatarId = "boy" | "girl";

export type AnimationDefinition = {
  file: string;
  category: string;
  avatars: AvatarId[];
  preferredAvatar?: AvatarId;
};

export const ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: {
    file: "/characters/animations/idle.vrma",
    category: "idle",
    avatars: ["boy", "girl"],
  },

  wave: {
    file: "/characters/animations/wave.vrma",
    category: "greeting",
    avatars: ["boy", "girl"],
  },

  sad: {
    file: "/characters/animations/sad.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  angry: {
    file: "/characters/animations/angry.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  "angry_gesture": {
    file: "/characters/animations/angry_gesture.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  acknowledge: {
    file: "/characters/animations/acknowledge.vrma",
    category: "conversation",
    avatars: ["boy", "girl"],
  },

  "annoying_head_nod": {
    file: "/characters/animations/annoying head nod.vrma",
    category: "conversation",
    avatars: ["boy", "girl"],
  },

  "arm_stretching": {
    file: "/characters/animations/arm_stretching.vrma",
    category: "exercise",
    avatars: ["boy", "girl"],
  },

  defeated: {
    file: "/characters/animations/defeated.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  happy_yes: {
    file: "/characters/animations/happy_yes.vrma",
    category: "conversation",
    avatars: ["boy", "girl"],
  },

  laughing: {
    file: "/characters/animations/laughing.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  rallying: {
    file: "/characters/animations/rallying.vrma",
    category: "motivation",
    avatars: ["boy", "girl"],
  },

  "relieved_sigh": {
    file: "/characters/animations/relieved_sigh.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  "shaking_head_no": {
    file: "/characters/animations/shaking_head_no.vrma",
    category: "conversation",
    avatars: ["boy", "girl"],
  },

  snake_dance: {
    file: "/characters/animations/snake_dance.vrma",
    category: "dance",
    avatars: ["boy", "girl"],
  },

  surprised: {
    file: "/characters/animations/surprised.vrma",
    category: "emotion",
    avatars: ["boy", "girl"],
  },

  thinking: {
    file: "/characters/animations/thinking.vrma",
    category: "conversation",
    avatars: ["boy", "girl"],
  },

  warming_up: {
    file: "/characters/animations/warming_up.vrma",
    category: "exercise",
    avatars: ["boy", "girl"],
    preferredAvatar: "boy",
  },

  wave_dance: {
    file: "/characters/animations/wave_dance.vrma",
    category: "dance",
    avatars: ["boy", "girl"],
  },

  welcome: {
    file: "/characters/animations/welcome.vrma",
    category: "greeting",
    avatars: ["boy", "girl"],
  },
};

export function canUseAnimation(
  animationId: string,
  avatar: AvatarId
): boolean {
  return ANIMATIONS[animationId]?.avatars.includes(avatar) ?? false;
}