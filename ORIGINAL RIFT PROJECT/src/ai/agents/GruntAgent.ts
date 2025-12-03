import { SeekBehavior, Vector3 } from 'yuka';
import * as THREE from 'three';
import { GameEntity } from '../core/GameEntity';
import { EnemyFactory } from '../../entities/EnemyFactory';

export class GruntAgent extends GameEntity {
    private target: { position: THREE.Vector3 };
    private seekBehavior: SeekBehavior;

    constructor(target: { position: THREE.Vector3 }) {
        // Create mesh using existing factory
        const mesh = EnemyFactory.createEnemyMesh('grunt', 0xFF0000); // Red for Grunt
        super(mesh);

        this.target = target;

        // Setup steering
        this.seekBehavior = new SeekBehavior(new Vector3());
        this.steering.add(this.seekBehavior);

        // Stats
        this.maxSpeed = 5;
        this.mass = 1;
    }

    public update(delta: number): this {
        // Sync seek target with actual target position
        this.seekBehavior.target.set(this.target.position.x, this.target.position.y, this.target.position.z);

        super.update(delta);
        return this;
    }
}
