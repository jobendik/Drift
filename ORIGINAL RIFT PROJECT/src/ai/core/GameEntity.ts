import { Vehicle } from 'yuka';
import * as THREE from 'three';

export class GameEntity extends Vehicle {
    public mesh: THREE.Object3D;

    constructor(mesh: THREE.Object3D) {
        super();
        this.mesh = mesh;
    }

    public update(delta: number): this {
        super.update(delta);

        // Sync visual mesh with Yuka entity
        this.mesh.position.copy(this.position as any);
        this.mesh.quaternion.copy(this.rotation as any);

        return this;
    }
}
