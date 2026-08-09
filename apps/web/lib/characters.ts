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
    id: 'boy',
    name: 'Boy',
    model: '/characters/boy.vrm',
    personalityId: 'funny',
    personalityTags: ['Friendly', 'Energetic'],
    defaultTransform: { position: [0, -0.9, 0], rotation: [0, 0, 0], scale: 1.0, cameraPosition: [0, 0.4, 1.8], cameraTarget: [0, 0.4, 0] }
  },
  {
    id: 'girl',
    name: 'Girl',
    model: '/characters/girl.vrm',
    personalityId: 'supportive',
    personalityTags: ['Calm', 'Supportive'],
    defaultTransform: { position: [0, -0.9, 0], rotation: [0, 0, 0], scale: 1.0, cameraPosition: [0, 0.4, 1.8], cameraTarget: [0, 0.4, 0] }
  }
];
