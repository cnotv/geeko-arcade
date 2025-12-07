<script setup>
import { onMounted, ref } from "vue";
import { getTools, getModel } from "@webgametoolkit/threejs";
import { controllerForward, controllerTurn } from "@webgametoolkit/animation";
import { chameleonConfig, setupConfig, playerConfig, botConfig } from "../config";
import { rombusGenerator } from "../utils/generators";

let currentAnimation = "Idle_A";

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

const checkColliders = (model, blocks) => {

};

const moveModel = (model, delta, blocks, angle) => {
  controllerTurn(model, angle);
  controllerForward(model, [], 0.01, delta)
};

const getAngle = () => {
  // Return a random angle between -1 and 1
  return (Math.random() * 2 - 1) * 0.05;
};

const canvas = ref(null);
const init = async () => {
  const { setup, animate, scene, world, getDelta } = await getTools({ canvas: canvas.value });
  await setup({
    config: setupConfig,
    defineSetup: async () => {
      const player = await getModel(scene, world, "chameleon.fbx", {...chameleonConfig, ...playerConfig });
      const bot = await getModel(scene, world, "chameleon.fbx", { ...chameleonConfig, ...botConfig  });
      const blocks = await Promise.all(positions.map(([x, y, z]) => getModel(scene, world, "sand_block.glb", {
        position: [2 * x, 2 * y + 1, -2 * z],
        scale: [0.01, 0.01, 0.01],
      })));

      animate({
        beforeTimeline: () => {},
        timeline: [
          {
            action: () => {
              const playerAngle = getAngle();
              const botAngle = getAngle();
              moveModel(player, getDelta(), blocks, playerAngle);
              moveModel(bot, getDelta(), blocks, botAngle);
              checkColliders(player, blocks);
              checkColliders(bot, blocks);
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
