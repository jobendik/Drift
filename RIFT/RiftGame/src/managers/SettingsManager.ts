import { CAMERA_CONFIG } from '../config/gameConfig';

export interface GameSettings {
    sensitivity: number;
    volume: number;
    fov: number;
}

export class SettingsManager {
    private settings: GameSettings;
    private readonly STORAGE_KEY = 'rift_game_settings';

    constructor() {
        this.settings = this.loadSettings();
    }

    private loadSettings(): GameSettings {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    sensitivity: parsed.sensitivity ?? CAMERA_CONFIG.mouseSensitivity,
                    volume: parsed.volume ?? 0.5,
                    fov: parsed.fov ?? CAMERA_CONFIG.baseFOV,
                };
            } catch (e) {
                console.warn('Failed to parse settings, using defaults');
            }
        }

        return {
            sensitivity: CAMERA_CONFIG.mouseSensitivity,
            volume: 0.5,
            fov: CAMERA_CONFIG.baseFOV,
        };
    }

    public saveSettings(): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    }

    public getSettings(): GameSettings {
        return this.settings;
    }

    public setSensitivity(val: number): void {
        this.settings.sensitivity = val;
        this.saveSettings();
    }

    public setVolume(val: number): void {
        this.settings.volume = val;
        this.saveSettings();
    }

    public setFOV(val: number): void {
        this.settings.fov = val;
        this.saveSettings();
    }
}
