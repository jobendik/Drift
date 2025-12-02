
import world from './core/World';

// Expose world for debugging
(window as any).world = world;

const startButton = document.getElementById('start');
if (startButton) {
	startButton.addEventListener('click', () => {

		const startScreen = document.getElementById('startScreen');
		if (startScreen) startScreen.remove();

		world.init();

	});
}
