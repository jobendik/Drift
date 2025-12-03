import { Game } from './Game';
import './styles.css';

console.log('Main.ts loaded');

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing game...');
  try {
    const game = new Game();
    game.start();
    console.log('Game started successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
