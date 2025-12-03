import { EntityManager } from 'yuka';
import * as THREE from 'three';

export class AIManager {
    private entityManager: EntityManager;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.entityManager = new EntityManager();
        this.scene = scene;
    }

    public update(delta: number): void {
        this.entityManager.update(delta);
    }

    public add(entity: any): void {
        this.entityManager.add(entity);
        if (entity.mesh) {
            this.scene.add(entity.mesh);
        }
    }

    public remove(entity: any): void {
        this.entityManager.remove(entity);
        if (entity.mesh) {
            this.scene.remove(entity.mesh);
        }
    }

    public clear(): void {
        this.entityManager.clear();
        // Note: We might need to track entities to remove their meshes if clear is called
        // For now, assume manual removal or scene clear handles it
    }
}
