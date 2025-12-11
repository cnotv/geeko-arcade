<script setup>
import { greenScore, redScore } from './composable';
</script>

<template>
  <div class="ui-overlay">
    <div class="score-left">{{ greenScore }}</div>
    <div class="score-right">{{ redScore }}</div>
  </div>
</template>

<style scoped>
.ui-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 1000;
}

.score-left {
  position: absolute;
  top: 20px;
  left: 30px;
  font-size: 72px;
  font-weight: bold;
  color: #00ff00;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
  font-family: monospace;
}

.score-right {
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 72px;
  font-weight: bold;
  color: #ff0000;
  text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.8);
  font-family: monospace;
}
</style>
