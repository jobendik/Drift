import { MapConfig } from './MapConfig';
import { ARENA_CONFIG } from './gameConfig';

export const DEFAULT_MAP: MapConfig = {
    name: 'Arena Classic',
    size: ARENA_CONFIG.size,
    wallHeight: ARENA_CONFIG.wallHeight,
    walls: [
        { pos: [0, ARENA_CONFIG.wallHeight / 2, -ARENA_CONFIG.size / 2], size: [ARENA_CONFIG.size, ARENA_CONFIG.wallHeight, 1], rot: [0, 0, 0], accent: 0x00ffff },
        { pos: [0, ARENA_CONFIG.wallHeight / 2, ARENA_CONFIG.size / 2], size: [ARENA_CONFIG.size, ARENA_CONFIG.wallHeight, 1], rot: [0, 0, 0], accent: 0xff00ff },
        { pos: [-ARENA_CONFIG.size / 2, ARENA_CONFIG.wallHeight / 2, 0], size: [ARENA_CONFIG.size, ARENA_CONFIG.wallHeight, 1], rot: [0, Math.PI / 2, 0], accent: 0xffff00 },
        { pos: [ARENA_CONFIG.size / 2, ARENA_CONFIG.wallHeight / 2, 0], size: [ARENA_CONFIG.size, ARENA_CONFIG.wallHeight, 1], rot: [0, Math.PI / 2, 0], accent: 0x00ff88 },
    ],
    platforms: [
        { pos: [15, 1.5, 15], size: [8, 3, 8], accent: 0x00ffff },
        { pos: [-15, 1.5, -15], size: [8, 3, 8], accent: 0xff00ff },
        { pos: [15, 1.5, -15], size: [8, 3, 8], accent: 0xffff00 },
        { pos: [-15, 1.5, 15], size: [8, 3, 8], accent: 0x00ff88 },
        { pos: [0, 2, 20], size: [12, 4, 6], accent: 0x00aaff },
        { pos: [0, 2, -20], size: [12, 4, 6], accent: 0xff5500 },
    ],
    ramps: [
        { pos: [15, 0.5, 10], size: [8, 1, 6], rot: -0.3 },
        { pos: [-15, 0.5, 10], size: [8, 1, 6], rot: 0.3 },
        { pos: [15, 0.5, -10], size: [8, 1, 6], rot: 0.3 },
        { pos: [-15, 0.5, -10], size: [8, 1, 6], rot: -0.3 },
        { pos: [0, 1, 16], size: [6, 2, 4], rot: -0.4 },
        { pos: [0, 1, -16], size: [6, 2, 4], rot: 0.4 },
    ],
    covers: [
        { pos: [8, 0.75, 0], size: [1.5, 1.5, 4] },
        { pos: [-8, 0.75, 0], size: [1.5, 1.5, 4] },
        { pos: [0, 0.75, 8], size: [4, 1.5, 1.5] },
        { pos: [0, 0.75, -8], size: [4, 1.5, 1.5] },
        { pos: [18, 0.5, 0], size: [1, 1, 6] },
        { pos: [-18, 0.5, 0], size: [1, 1, 6] },
        { pos: [0, 0.5, 18], size: [6, 1, 1] },
        { pos: [0, 0.5, -18], size: [6, 1, 1] },
    ],
    pillars: [
        [12, 0, 12],
        [-12, 0, 12],
        [12, 0, -12],
        [-12, 0, -12],
    ]
};

export const BATTLE_ROYALE_MAP: MapConfig = {
    name: 'Battle Royale Island',
    size: 500,
    wallHeight: 15,
    walls: [
        // Outer boundary
        { pos: [0, 7.5, -250], size: [500, 15, 2], rot: [0, 0, 0], accent: 0xff0000 },
        { pos: [0, 7.5, 250], size: [500, 15, 2], rot: [0, 0, 0], accent: 0xff0000 },
        { pos: [-250, 7.5, 0], size: [500, 15, 2], rot: [0, Math.PI / 2, 0], accent: 0xff0000 },
        { pos: [250, 7.5, 0], size: [500, 15, 2], rot: [0, Math.PI / 2, 0], accent: 0xff0000 },

        // Central Complex
        { pos: [0, 10, 0], size: [40, 20, 40], rot: [0, 0, 0], accent: 0x00ffff },
    ],
    platforms: [
        // Watchtowers
        { pos: [100, 15, 100], size: [20, 2, 20], accent: 0xffff00 },
        { pos: [-100, 15, 100], size: [20, 2, 20], accent: 0xffff00 },
        { pos: [100, 15, -100], size: [20, 2, 20], accent: 0xffff00 },
        { pos: [-100, 15, -100], size: [20, 2, 20], accent: 0xffff00 },

        // Floating Islands
        { pos: [0, 30, 0], size: [60, 2, 60], accent: 0xff00ff },
    ],
    ramps: [
        // Ramps to central complex
        { pos: [0, 0, 35], size: [10, 2, 30], rot: -0.5 },
        { pos: [0, 0, -35], size: [10, 2, 30], rot: 0.5 },
    ],
    covers: [
        // Scattered cover (Forest area)
        { pos: [150, 2, 150], size: [4, 4, 4] },
        { pos: [160, 2, 140], size: [4, 4, 4] },
        { pos: [140, 2, 160], size: [4, 4, 4] },

        // Industrial area
        { pos: [-150, 3, -150], size: [10, 6, 2] },
        { pos: [-150, 3, -140], size: [10, 6, 2] },
        { pos: [-160, 3, -145], size: [2, 6, 10] },
    ],
    pillars: [
        // "Trees"
        [50, 0, 50], [60, 0, 70], [40, 0, 80],
        [-50, 0, 50], [-60, 0, 70], [-40, 0, 80],
        [50, 0, -50], [60, 0, -70], [40, 0, -80],
        [-50, 0, -50], [-60, 0, -70], [-40, 0, -80],
    ]
};
