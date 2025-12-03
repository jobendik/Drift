# Blockline Arena

A wave-based survival shooter built with Three.js and TypeScript featuring an enhanced weapon system with realistic recoil, spread patterns, and visual effects.

## Project Structure

```
Arena/
├── src/
│   ├── config/
│   │   └── gameConfig.ts         # Game configuration constants
│   ├── core/
│   │   ├── InputManager.ts       # Input handling
│   │   └── PostProcessing.ts     # Post-processing effects
│   ├── entities/
│   │   ├── Player.ts              # Player class with movement and stats
│   │   └── EnemyManager.ts        # Enemy spawning and AI
│   ├── systems/
│   │   ├── WeaponSystem.ts        # Weapon mechanics and effects
│   │   ├── ParticleSystem.ts      # Particle effects
│   │   └── PickupSystem.ts        # Item pickup system
│   ├── ui/
│   │   └── HUDManager.ts          # HUD and UI management
│   ├── world/
│   │   └── Arena.ts               # Arena generation
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── Game.ts                    # Main game class
│   ├── main.ts                    # Entry point
│   ├── styles.css                 # Game styles
│   └── index.html                 # HTML template
├── dist/                          # Build output
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Features

- **Enhanced Weapon System**: Realistic recoil patterns, spread mechanics, and visual feedback
- **Advanced Movement**: Smooth character controller with sprint, jump, and stamina
- **Wave-Based Gameplay**: Progressively harder enemy waves
- **Power-ups**: Damage boost, speed boost, and rapid fire
- **Post-Processing**: Bloom, chromatic aberration, and vignette effects
- **Professional Architecture**: Modular TypeScript codebase with clear separation of concerns

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Type Checking

```bash
npm run type-check
```

## Controls

- **WASD** - Move
- **SHIFT** - Sprint
- **SPACE** - Jump
- **MOUSE** - Aim
- **LEFT CLICK** - Shoot
- **R** - Reload
- **ESC** - Pause

## Technical Details

- **Engine**: Three.js r159
- **Language**: TypeScript 5.3
- **Build Tool**: Webpack 5
- **Module System**: ES2020

## Architecture

The game follows a modular architecture with clear separation between:

- **Core Systems**: Input, rendering, and post-processing
- **Game Logic**: Player, enemies, weapons, and pickups
- **UI**: HUD and menu management
- **Configuration**: Centralized game constants

Each module is independently testable and can be extended without affecting other systems.

## License

MIT
