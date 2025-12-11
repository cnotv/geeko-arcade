
import { computed, onUnmounted, shallowRef } from 'vue';
import { createGame } from '@webgametoolkit/game';

// Access the same game state instance
const gameState = shallowRef();
createGame({greenScore: 0, redScore: 0}, gameState, onUnmounted);

export const greenScore = computed(() => gameState.value.data.greenScore || 0);
export const redScore = computed(() => gameState.value.data.redScore || 0);

export const setScore = (key: 'greenScore' | 'redScore', score: number) => gameState.value.setData(key, score);
