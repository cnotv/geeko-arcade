<script setup lang="ts">
import { onMounted, ref, shallowRef, type Ref } from "vue";
import { getTools, getModel, colorModel, setCameraPreset } from "@webgametoolkit/threejs";
import { AnimatedComplexModel, ComplexModel, controllerForward, controllerTurn, updateAnimation } from "@webgametoolkit/animation";
import { setupConfig, chameleonConfig, playerConfig, botConfig } from "../config";
import { rombusGenerator } from "../utils/generators";
import { setScore } from "./composable";
import { createControls } from "@webgametoolkit/controls";

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
const greenBlocks = new Set<number>();
const redBlocks = new Set<number>();

const checkColliders = (model: ComplexModel, targets: ComplexModel[], materialColors: number[], blockSet: Set<number>, scoreKey: 'greenScore' | 'redScore', offset: number = 1.5): void => {
  if (!model?.mesh?.position) return;
  
  const modelPos = model.mesh.position;
  
  targets.forEach((target, index) => {
    if (!target?.mesh.position) return;
    
    const blockPos = target.mesh.position;
    const distance = Math.sqrt(
      Math.pow(modelPos.x - blockPos.x, 2) +
      Math.pow(modelPos.z - blockPos.z, 2)
    );
    if (distance < offset) {
      // Change target color using colorModel when colliding
      colorModel(target.mesh, materialColors);
      // Track this block and update score
      if (!blockSet.has(index)) {
        blockSet.add(index);
        setScore(scoreKey, blockSet.size);
      }
    }
  });
};

const moveModel = (model: AnimatedComplexModel, delta: number, blocks: ComplexModel[], blockSize: number, angle: number, backward?: boolean): void => {
  controllerTurn(model, angle);
  controllerForward(model, [], blockSize, delta, 'Idle_A', backward);
};

/**
 * Determine angle towards the nearest block
 * @param model The animated model to rotate
 * @param blocks Array of block models to find the nearest one
 * @returns Angle in radians for the model to face the nearest block
 */
const getAngle = (model: AnimatedComplexModel, blocks: ComplexModel[]): number => {
  return 0
};


const currentActions = shallowRef({});
const bindings = {
  mapping: {
    keyboard: {
      Enter: "toggle-move",
      a: "left",
      d: "right",
      w: "forward",
      s: "backward",
    },
    gamepad: {
      left: "left",
      right: "right",
      forward: "forward",
      backward: "backward",
    },
  },
  onAction: (action: any, trigger: any, device: any) => {
    if (currentActions.value[action]) return; // Prevent multiple triggers from the keyboard
    currentActions.value = {
      ...currentActions.value,
      [action]: { action, trigger, device },
    };
  },
  onRelease: (action: any) => {
    currentActions.value = { ...currentActions.value, [action]: null };
  },
};
createControls(bindings);

const canvas: Ref<HTMLCanvasElement | null> = ref(null);
const init = async (): Promise<void> => {
  const blockSize: number = 2;
  const frequency: number = 20;
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
            name: "Update Bot",
            frequency: frequency,
            action: () => {
              const botAngle: number = getAngle(bot, blocks);
              checkColliders(bot, blocks, [0xff0000], redBlocks, "redScore");
              moveModel(bot, getDelta(), blocks, blockSize, botAngle);
            },
          },
          {
            name: "Update Player",
            frequency: frequency,
            action: () => {
              checkColliders(player, blocks, [0x00ff00], greenBlocks, "greenScore");
              if (['left', 'right', 'forward', 'backward'].some((key) => currentActions.value[key])) {
                let angle = 0;
                if (currentActions.value["left"]) angle += 90;
                if (currentActions.value["right"]) angle -= 90;
                moveModel(player, getDelta(), blocks, blockSize, angle, !!currentActions.value["backward"]);
                // updateAnimation(player, { currentActions: currentActions.value
              }
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
