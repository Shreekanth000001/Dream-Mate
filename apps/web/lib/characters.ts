export interface CharacterDef {
  id: string;
  name: string;
  model: string;
  personalityId: string;
  personalityTags: string[];
  defaultTransform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    cameraPosition: [number, number, number];
    cameraTarget: [number, number, number];
  };
}

export const CHARACTER_REGISTRY: CharacterDef[] = [
  {
    id: 'alex',
    name: 'Alex',
    model: '/characters/alex.glb',
    personalityId: 'supportive',
    personalityTags: ['Friendly', 'Supportive'],
    defaultTransform: { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5, cameraPosition: [0, 0.2, 1.4], cameraTarget: [0, 0.1, 0] }
  },
  {
    id: 'maya',
    name: 'Maya',
    model: '/characters/maya.glb',
    personalityId: 'calm',
    personalityTags: ['Calm', 'Caring'],
    defaultTransform: { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5, cameraPosition: [0, 0.2, 1.4], cameraTarget: [0, 0.1, 0] }
  },
  {
    id: 'kai',
    name: 'Kai',
    model: '/characters/kai.glb',
    personalityId: 'funny',
    personalityTags: ['Funny', 'Energetic'],
    defaultTransform: { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5, cameraPosition: [0, 0.2, 1.4], cameraTarget: [0, 0.1, 0] }
  },
  {
    id: 'nova',
    name: 'Nova',
    model: '/characters/nova.glb',
    personalityId: 'curious',
    personalityTags: ['Curious', 'Adventurous'],
    defaultTransform: { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5, cameraPosition: [0, 0.2, 1.4], cameraTarget: [0, 0.1, 0] }
  },
  {
    id: 'default',
    name: 'Default',
    model: '/avatar.glb',
    personalityId: 'supportive',
    personalityTags: ['Standard', 'Friendly'],
    defaultTransform: { position: [0, -1.6, 0], rotation: [0, 0, 0], scale: 1.5, cameraPosition: [0, 0.2, 1.4], cameraTarget: [0, 0.1, 0] }
  }
];
