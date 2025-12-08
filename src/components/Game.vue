<script setup lang="ts">
import { onMounted, ref, type Ref } from "vue";
import { getTools, getModel, colorModel, setCameraPreset } from "@webgametoolkit/threejs";
import { AnimatedComplexModel, ComplexModel, controllerForward, controllerTurn } from "@webgametoolkit/animation";
import { chameleonConfig, setupConfig, playerConfig, botConfig } from "../config";
import { rombusGenerator } from "../utils/generators";

let currentAnimation: string = "Idle_A";

/**
 * Define block positions using a matrix
 * E.g. 
 * const positions = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 0, 2],
    [0, 1, 2],
    [-1, 0, 2],
    [-2, 0, 0],
    [-2, 0, 1],
    [-2, 0, 2],
  ]
 */
const positions = Array.from(rombusGenerator(10));

const checkColliders = (model: ComplexModel, targets: ComplexModel[], materialColors: number[], offset: number = 1.5): void => {
  if (!model?.mesh?.position) return;
  
  const modelPos = model.mesh.position;
  
  targets.forEach((target) => {
    if (!target?.mesh.position) return;
    
    const blockPos = target.mesh.position;
    const distance = Math.sqrt(
      Math.pow(modelPos.x - blockPos.x, 2) +
      Math.pow(modelPos.z - blockPos.z, 2)
    );
    if (distance < offset) {
      // Change target color using colorModel when colliding
      colorModel(target.mesh, materialColors);
    }
  });
};

const moveModel = (model: AnimatedComplexModel, delta: number, blocks: ComplexModel[], blockSize: number, angle: number): void => {
  controllerTurn(model, angle);
  controllerForward(model, [], blockSize, delta);
};

const getAngle = (): number => {
  // Return a random angle between -1 and 1
  return (Math.random() * 2 - 1) * 0.05;
};

const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const init = async (): Promise<void> => {
  const blockSize: number = 2;
  const { setup, animate, scene, world, getDelta, camera } = await getTools({ canvas: canvas.value! });
  await setup({
    config: setupConfig,
    defineSetup: async () => {
      setCameraPreset(camera, "orthographic");
      const player = await getModel(scene, world, "chameleon.fbx", {...chameleonConfig, ...playerConfig });
      const bot = await getModel(scene, world, "chameleon.fbx", { ...chameleonConfig, ...botConfig });
      const blocks = await Promise.all(positions.map(([x, y, z]) => getModel(scene, world, "sand_block.glb", {
        position: [blockSize * x, blockSize * y, -blockSize * z],
        scale: [0.009, 0.009, 0.009],
      })));

      animate({
        beforeTimeline: () => {},
        timeline: [
          {
            frequency: 20,
            action: () => {
              const botAngle: number = getAngle(bot, blocks);
              checkColliders(bot, blocks, [0xff0000]);
              moveModel(bot, getDelta(), blocks, blockSize, botAngle);
            },
          },
          {
            action: () => {
              checkColliders(player, blocks, [0x00ff00]);
            },
          },
        ],
      });
    },
  });
};

onMounted(async () => init());
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100vh;
}
</style>
