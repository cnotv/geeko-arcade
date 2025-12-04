<script setup>
import { onMounted, ref } from "vue";
import { getTools, getModel } from "@webgametoolkit/threejs";
import { updateAnimation } from "@webgametoolkit/animation";

const canvas = ref(null);
const init = async () => {
  const { setup, animate, scene, world, getDelta } = await getTools({
    stats: { init: () => {}, start: () => {}, stop: () => {} },
    route: { query: {} },
    canvas: canvas.value,
  });

  await setup({
    config: {
      camera: { position: [0, 5, 20] },
      ground: { size: 10000, color: 0x559955 },
      sky: { size: 500, color: 0x87ceeb },
      lights: { directional: { intensity: 2 } },
    },
    defineSetup: async () => {
      const geeko = await getModel(scene, world, "geeko.fbx", {
        position: [0, -0.75, 0],
        scale: [0.05, 0.05, 0.05],
        boundary: 0.5,
        castShadow: true,
        receiveShadow: true,
        animations: "geeko_ani.fbx",
      });

      animate({
        beforeTimeline: () => {},
        timeline: [
          {
            action: () => {
              updateAnimation(geeko.mixer, geeko.actions["Walk"], getDelta(), 4);
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
