import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages sirve el juego en https://tobini.github.io/kotodama/
  base: command === 'build' ? '/kotodama/' : '/',
}));
