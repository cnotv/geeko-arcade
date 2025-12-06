<script setup>
import { onMounted, ref, onUnmounted } from "vue";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

const canvas = ref(null);
const score = ref(0);
const countdown = ref(30);
const gameState = ref('waiting'); // 'waiting', 'playing', 'ended'

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

let greenGeekoMixer, redGeekoMixer;
let greenGeekoAction, redGeekoAction;
let greenGeekoObject, redGeekoObject;
let currentGreenCubeIndex = 0;
let currentRedCubeIndex = 0;
let cubeStates = []; // Track cube states: 0=unchanged, 1=green, 2=red
let countdownInterval;
let redGeekoMoveInterval;

// Jump animation state
let greenJumpProgress = 0;
let redJumpProgress = 0;
let greenJumpStart = null;
let greenJumpEnd = null;
let redJumpStart = null;
let redJumpEnd = null;
let isGreenJumping = false;
let isRedJumping = false;

const init = async () => {
  // Setup scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  // Q*bert style pyramid configuration
  const cubeSize = 2;
  const levels = 7;

  // Setup orthographic camera for isometric view
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 30;
  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  // Isometric view - positioned to see pyramid from corner
  const pyramidCenter = (levels - 1) * cubeSize / 2;
  const angle = Math.PI / 6; // 30 degrees
  const distance = 20;
  camera.position.set(
    Math.sin(angle) * distance + 3,
    25,
    pyramidCenter - Math.cos(angle) * distance + 3
  );
  camera.lookAt(0, 5, pyramidCenter);

  // Setup renderer
  const renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Desaturated colors for cube faces
  const faceColors = [
    0xa8dadc, // Desaturated cyan (top)
    0xf1faee, // Desaturated white (bottom)
    0xe63946, // Desaturated red (front)
    0xf4a261, // Desaturated orange (back)
    0x2a9d8f, // Desaturated teal (left)
    0x457b9d, // Desaturated blue (right)
  ];
  
  // Create custom geometry with different colors per face
  const createColoredCubeGeometry = () => {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const colors = [];
    
    // Each face has 2 triangles, so 6 vertices per face, 36 total for cube
    for (let i = 0; i < 6; i++) {
      const color = new THREE.Color(faceColors[i]);
      for (let j = 0; j < 6; j++) {
        colors.push(color.r, color.g, color.b);
      }
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  };
  
  const geometry = createColoredCubeGeometry();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  
  // Define cube positions as a linear list
  const cubeMatrix = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ];
  
  // Calculate total cubes
  const totalCubes = cubeMatrix.length;
  const cubePositions = [];
  
  // Initialize cube states (0 = unchanged, 1 = green, 2 = red)
  cubeStates = new Array(totalCubes).fill(0);
  
  // Create instanced mesh
  const instancedMesh = new THREE.InstancedMesh(geometry, material, totalCubes);
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  
  const matrix = new THREE.Matrix4();
  
  // Build cubes based on list
  cubeMatrix.forEach((cube, index) => {
    const { row, col } = cube;
    
    // Q*bert isometric positioning - cubes touch at edges only
    let xPos, zPos;
    
    if (row === 0) {
      // Row 0 cubes sit centered between two cubes in row 1
      xPos = (col * 2 - 1) * cubeSize;
      zPos = 0;
    } else {
      // Row 1+ cubes use diagonal pattern
      xPos = (col - row) * cubeSize;
      zPos = (col + row) * cubeSize;
    }
    
    const yPos = row * cubeSize; // Each row is one level higher
    
    matrix.makeTranslation(xPos, yPos, zPos);
    instancedMesh.setMatrixAt(index, matrix);
    
    cubePositions.push({ x: xPos, y: yPos, z: zPos, level: row, row, col });
    
    // Add debug text label with coordinates on each face
    const createTextSprite = (text, offset) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      context.fillStyle = 'black';
      context.fillRect(0, 0, 512, 512);
      context.fillStyle = 'white';
      context.font = 'bold 120px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 256);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(xPos + offset.x, yPos + offset.y, zPos + offset.z);
      sprite.scale.set(1.8, 1.8, 1);
      return sprite;
    };
    
    // Add labels on each face
    scene.add(createTextSprite(`X:${xPos.toFixed(1)}`, { x: 0, y: cubeSize/2 + 0.01, z: 0 })); // Top
    scene.add(createTextSprite(`Y:${yPos.toFixed(1)}`, { x: 0, y: 0, z: cubeSize/2 + 0.01 })); // Front
    scene.add(createTextSprite(`Z:${zPos.toFixed(1)}`, { x: cubeSize/2 + 0.01, y: 0, z: 0 })); // Right
  });
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  // Load geeko models
  const loader = new FBXLoader();
  
  // Place geekos on first and last cubes
  const leftCubeIndex = 0;
  const rightCubeIndex = cubePositions.length > 1 ? cubePositions.length - 1 : 0;

  // Load green geeko (left side)
  greenGeekoObject = await new Promise((resolve, reject) => {
    loader.load('chameleon.fbx', (object) => resolve(object), undefined, reject);
  });
  greenGeekoObject.scale.set(0.04, 0.04, 0.04);
  greenGeekoObject.rotation.y = Math.PI;
  currentGreenCubeIndex = leftCubeIndex;
  greenGeekoObject.position.copy(cubePositions[leftCubeIndex]);
  greenGeekoObject.position.y += cubeSize / 2;
  greenGeekoObject.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.color.setHex(0x00ff00); // Green
    }
  });
  scene.add(greenGeekoObject);

  // Load red geeko (right side)
  redGeekoObject = await new Promise((resolve, reject) => {
    loader.load('chameleon.fbx', (object) => resolve(object), undefined, reject);
  });
  redGeekoObject.scale.set(0.04, 0.04, 0.04);
  redGeekoObject.rotation.y = Math.PI;
  currentRedCubeIndex = rightCubeIndex;
  redGeekoObject.position.copy(cubePositions[rightCubeIndex]);
  redGeekoObject.position.y += cubeSize / 2;
  redGeekoObject.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
      child.material.color.setHex(0xff0000); // Red
    }
  });
  scene.add(redGeekoObject);

  // Load animations
  const animObject = await new Promise((resolve, reject) => {
    loader.load('chameleon_animations.fbx', (object) => resolve(object), undefined, reject);
  });

  greenGeekoMixer = new THREE.AnimationMixer(greenGeekoObject);
  redGeekoMixer = new THREE.AnimationMixer(redGeekoObject);
  
  if (animObject.animations.length > 0) {
    const clip = animObject.animations.find(a => a.name === 'Jump') || animObject.animations[0];
    greenGeekoAction = greenGeekoMixer.clipAction(clip);
    redGeekoAction = redGeekoMixer.clipAction(clip);
    greenGeekoAction.setLoop(THREE.LoopOnce);
    redGeekoAction.setLoop(THREE.LoopOnce);
    greenGeekoAction.clampWhenFinished = true;
    redGeekoAction.clampWhenFinished = true;
  }

  // Game functions
  const startGame = () => {
    gameState.value = 'playing';
    score.value = 0;
    countdown.value = 30;
    cubeStates.fill(0);
    
    currentGreenCubeIndex = leftCubeIndex;
    greenGeekoObject.position.copy(cubePositions[leftCubeIndex]);
    greenGeekoObject.position.y += cubeSize / 2;
    
    currentRedCubeIndex = rightCubeIndex;
    redGeekoObject.position.copy(cubePositions[rightCubeIndex]);
    redGeekoObject.position.y += cubeSize / 2;
    
    countdownInterval = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        endGame();
      }
    }, 1000);
    
    // Start red geeko AI movement
    redGeekoMoveInterval = setInterval(() => {
      moveRedGeekoAI();
    }, 800);
  };

  const endGame = () => {
    gameState.value = 'ended';
    clearInterval(countdownInterval);
    clearInterval(redGeekoMoveInterval);
  };

  const moveGreenGeeko = (direction) => {
    if (gameState.value !== 'playing' || isGreenJumping) return;
    
    const currentPos = cubePositions[currentGreenCubeIndex];
    const currentLevel = currentPos.level;
    const cubesPerSide = levels - currentLevel;
    
    let targetRow = currentPos.row;
    let targetCol = currentPos.col;
    
    // WASD movement in isometric grid (inverted for camera view)
    if (direction === 'w') targetRow++;
    if (direction === 's') targetRow--;
    if (direction === 'a') targetCol++;
    if (direction === 'd') targetCol--;
    
    // Check if target is valid
    if (targetRow >= 0 && targetRow < cubesPerSide && targetCol >= 0 && targetCol < cubesPerSide) {
      // Find the target cube index
      let targetIndex = 0;
      for (let i = 0; i < cubePositions.length; i++) {
        if (cubePositions[i].level === currentLevel && 
            cubePositions[i].row === targetRow && 
            cubePositions[i].col === targetCol) {
          targetIndex = i;
          break;
        }
      }
      
      // Start jump animation
      isGreenJumping = true;
      greenJumpProgress = 0;
      greenJumpStart = greenGeekoObject.position.clone();
      greenJumpEnd = new THREE.Vector3(
        cubePositions[targetIndex].x,
        cubePositions[targetIndex].y + cubeSize / 2,
        cubePositions[targetIndex].z
      );
      
      // Rotate geeko to face movement direction
      const dx = greenJumpEnd.x - greenJumpStart.x;
      const dz = greenJumpEnd.z - greenJumpStart.z;
      const angle = Math.atan2(dx, dz);
      greenGeekoObject.rotation.y = angle;
      
      // Play jump animation
      if (greenGeekoAction) {
        greenGeekoAction.reset();
        greenGeekoAction.play();
      }
      
      // Change cube color if not already changed by green geeko
      if (cubeStates[targetIndex] === 0) {
        cubeStates[targetIndex] = 1; // Mark as green
        score.value = cubeStates.filter(s => s === 1).length; // Count green cubes
        
        // Update cube color (make it brighter)
        const color = new THREE.Color(0xffeb3b); // Bright yellow when changed
        instancedMesh.setColorAt(targetIndex, color);
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      } else if (cubeStates[targetIndex] === 2) {
        // Convert red to green
        cubeStates[targetIndex] = 1;
        score.value = cubeStates.filter(s => s === 1).length;
        
        const color = new THREE.Color(0xffeb3b);
        instancedMesh.setColorAt(targetIndex, color);
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      }
      
      currentGreenCubeIndex = targetIndex;
    }
  };

  const moveRedGeekoAI = () => {
    if (gameState.value !== 'playing' || isRedJumping) return;
    
    const currentPos = cubePositions[currentRedCubeIndex];
    const currentLevel = currentPos.level;
    const cubesPerSide = levels - currentLevel;
    
    // Find all valid adjacent cubes
    const possibleMoves = [];
    const directions = [
      { row: -1, col: 0 },  // up
      { row: 1, col: 0 },   // down
      { row: 0, col: -1 },  // left
      { row: 0, col: 1 }    // right
    ];
    
    for (const dir of directions) {
      const targetRow = currentPos.row + dir.row;
      const targetCol = currentPos.col + dir.col;
      
      if (targetRow >= 0 && targetRow < cubesPerSide && targetCol >= 0 && targetCol < cubesPerSide) {
        const targetIndex = cubePositions.findIndex(pos => 
          pos.level === currentLevel && pos.row === targetRow && pos.col === targetCol
        );
        
        if (targetIndex !== -1) {
          // Prioritize: unchanged (2), green (1), red (0)
          let priority = 0;
          if (cubeStates[targetIndex] === 0) priority = 2; // Unchanged
          else if (cubeStates[targetIndex] === 1) priority = 1; // Green
          possibleMoves.push({ index: targetIndex, priority });
        }
      }
    }
    
    if (possibleMoves.length > 0) {
      // Sort by priority and pick the best move
      possibleMoves.sort((a, b) => b.priority - a.priority);
      const targetIndex = possibleMoves[0].index;
      
      // Start jump animation
      isRedJumping = true;
      redJumpProgress = 0;
      redJumpStart = redGeekoObject.position.clone();
      redJumpEnd = new THREE.Vector3(
        cubePositions[targetIndex].x,
        cubePositions[targetIndex].y + cubeSize / 2,
        cubePositions[targetIndex].z
      );
      
      // Rotate geeko to face movement direction
      const dx = redJumpEnd.x - redJumpStart.x;
      const dz = redJumpEnd.z - redJumpStart.z;
      const angle = Math.atan2(dx, dz);
      redGeekoObject.rotation.y = angle;
      
      // Play jump animation
      if (redGeekoAction) {
        redGeekoAction.reset();
        redGeekoAction.play();
      }
      
      // Change cube color if not already changed by red geeko
      if (cubeStates[targetIndex] === 0) {
        cubeStates[targetIndex] = 2; // Mark as red
        score.value = cubeStates.filter(s => s === 1).length; // Count green cubes
        
        // Update cube color (make it different color)
        const color = new THREE.Color(0xff6b6b); // Reddish when red geeko visits
        instancedMesh.setColorAt(targetIndex, color);
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      } else if (cubeStates[targetIndex] === 1) {
        // Convert green to red
        cubeStates[targetIndex] = 2;
        score.value = cubeStates.filter(s => s === 1).length;
        
        const color = new THREE.Color(0xff6b6b);
        instancedMesh.setColorAt(targetIndex, color);
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      }
      
      currentRedCubeIndex = targetIndex;
    }
  };

  const clock = new THREE.Clock();

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update green geeko jump
    if (isGreenJumping && greenJumpStart && greenJumpEnd) {
      greenJumpProgress += delta * 2.5; // Jump speed
      
      if (greenJumpProgress >= 1) {
        greenJumpProgress = 1;
        isGreenJumping = false;
      }
      
      // Lerp position with arc
      const t = greenJumpProgress;
      greenGeekoObject.position.lerpVectors(greenJumpStart, greenJumpEnd, t);
      
      // Add arc height using sine curve
      const arcHeight = Math.sin(t * Math.PI) * 2;
      greenGeekoObject.position.y += arcHeight;
    }
    
    // Update red geeko jump
    if (isRedJumping && redJumpStart && redJumpEnd) {
      redJumpProgress += delta * 2.5; // Jump speed
      
      if (redJumpProgress >= 1) {
        redJumpProgress = 1;
        isRedJumping = false;
      }
      
      // Lerp position with arc
      const t = redJumpProgress;
      redGeekoObject.position.lerpVectors(redJumpStart, redJumpEnd, t);
      
      // Add arc height using sine curve
      const arcHeight = Math.sin(t * Math.PI) * 2;
      redGeekoObject.position.y += arcHeight;
    }
    
    if (greenGeekoMixer) greenGeekoMixer.update(delta);
    if (redGeekoMixer) redGeekoMixer.update(delta);
    
    renderer.render(scene, camera);
  };

  // Keyboard handlers
  const onKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      keys[key] = true;
      moveGreenGeeko(key);
    }
    if (key === ' ') {
      e.preventDefault();
      if (gameState.value === 'waiting' || gameState.value === 'ended') {
        startGame();
      }
    }
  };

  const onKeyUp = (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      keys[key] = false;
    }
  };

  // Handle window resize
  const onResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  animate();
  
  return () => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    clearInterval(countdownInterval);
    clearInterval(redGeekoMoveInterval);
  };
};

let cleanup;

onMounted(async () => {
  cleanup = await init();
});

onUnmounted(() => {
  if (cleanup) cleanup();
});
</script>

<template>
  <div>
    <canvas ref="canvas"></canvas>
    <div class="hud">
      <div class="score">Score: {{ score }}</div>
      <div class="timer">Time: {{ countdown }}s</div>
      <div v-if="gameState === 'waiting'" class="message">Press SPACE to start</div>
      <div v-if="gameState === 'ended'" class="message">Game Over! Press SPACE to restart</div>
    </div>
  </div>
</template>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100vh;
}

.hud {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.score, .timer {
  color: white;
  font-family: monospace;
  padding: 10px 20px;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
}

.message {
  color: #ffeb3b;
  padding: 20px 40px;
  font-family: monospace;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.9);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

<style scoped>
canvas {
  display: block;
  width: 100%;
  height: 100vh;
}
</style>
