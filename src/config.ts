export const playerConfig = { position: [0, 1.75, 0] };
export const botConfig = {
  position: [5, 1.75, 0],
  materialColors: [0xff0000],
};
export const chameleonConfig = {
  scale: [0.05, 0.05, 0.05],
  restitution: -10,
  boundary: 0.5,
  type: "kinematicPositionBased",
  hasGravity: false,
  castShadow: true,
  receiveShadow: true,
  animations: "chameleon_animations.fbx",
};

export const setupConfig = {
  camera: { position: [0, 5, 20] },
  ground: { size: 10000, color: 0x99cc99 },
  sky: { size: 500, color: 0x87ceeb },
  lights: { directional: { intensity: 0.1 } },
};
