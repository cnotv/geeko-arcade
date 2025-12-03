<script setup>
import { onMounted, ref } from 'vue';
import { getTools, getModel } from '@webgametoolkit/threejs';

const canvas = ref(null);

onMounted(async () => {
  const { setup, animate, scene, world } = getTools({
    stats: { init: () => {}, start: () => {}, stop: () => {} },
    route: {},
    canvas: canvas.value
  });

  await setup({
    config: {
      camera: { position: [0, 5, 10] },
      ground: { size: 100, color: 0x00ff00 },
      sky: { size: 500, color: 0x87ceeb },
      lights: { directional: { intensity: 2 } },
    },
    defineSetup: async () => {
      await getModel(scene, world, 'geeko.glb', {
        position: [0, 0, 0],
        scale: [2, 2, 2],
        castShadow: true,
        receiveShadow: true,
      });

      animate({
        beforeTimeline: () => {},
        timeline: [],
      });
    },
  });
});
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
