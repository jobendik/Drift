export interface MapObjectConfig {
    pos: [number, number, number];
    size: [number, number, number];
    rot?: [number, number, number] | number; // Support both Euler and simple Y-rotation
    color?: number; // Optional override
    accent?: number; // For neon edges
}

export interface MapConfig {
    name: string;
    size: number;
    wallHeight: number;
    walls: MapObjectConfig[];
    platforms: MapObjectConfig[];
    ramps: MapObjectConfig[];
    covers: MapObjectConfig[];
    pillars: number[][]; // Simple [x, y, z] positions for standard pillars
}
