<script setup>
import { onMounted, ref } from "vue";
import { getTools, getModel } from "@webgametoolkit/threejs";
import { updateAnimation } from "@webgametoolkit/animation";
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

const moveModel = (model, delta) => {
  updateAnimation(model.mixer, model.actions[currentAnimation], delta, 4);
  moveTo
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
              moveModel(player, getDelta(), playerConfig.position);
              moveModel(bot, getDelta(), botConfig.position);
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
