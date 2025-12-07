export const playerConfig = { position: [-10, 2, 10] };
export const botConfig = {
  position: [10, 2, -10],
  // materialColors: [0xff0000],
};
export const chameleonConfig = {
  scale: [0.03, 0.03, 0.03],
  restitution: -10,
  boundary: 0.5,
  type: "kinematicPositionBased",
  hasGravity: false,
  castShadow: true,
  receiveShadow: true,
  animations: "chameleon_animations.fbx",
  material: true,
  materialType: "MeshLambertMaterial",
};

export const setupConfig = {
  camera: { position: [0, 5, 20] },
  ground: { size: 10000, color: 0x99cc99 },
  sky: { size: 500, color: 0x87ceeb },
  lights: {
    ambient: {
      color: 0xffffff,
      intensity: 2,
    },
    directional: {
      color: 0xffffff,
      intensity: 4.0,
      position: [20, 30, 20],
      castShadow: true,
      shadow: {
        mapSize: { width: 4096, height: 4096 },
        camera: {
          near: 0.5,
          far: 500,
          left: -50,
          right: 50,
          top: 50,
          bottom: -50,
        },
        bias: -0.0001,
        radius: 1,
      },
    },
  },
};
