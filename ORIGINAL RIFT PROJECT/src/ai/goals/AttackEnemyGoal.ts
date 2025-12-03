import { Goal, Vector3 } from 'yuka';
import { GameEntity } from '../core/GameEntity';
import * as THREE from 'three';

export class AttackEnemyGoal<T extends GameEntity> extends Goal<T> {
    private target: { position: THREE.Vector3 };

    constructor(owner: T, target: { position: THREE.Vector3 }) {
        super(owner);
        this.target = target;
    }

    public activate(): void {
        // console.log('AttackEnemyGoal activated');
    }

    public process(): number {
        const owner = this.owner;
        if (!owner) return Goal.STATUS.FAILED as unknown as number;

        const targetPos = new Vector3(this.target.position.x, this.target.position.y, this.target.position.z);

        // Simple logic: Look at target
        const distance = owner.position.distanceTo(targetPos);

        if (distance < 20) {
            // In range, "shoot"
        }

        // Move towards target
        const toTarget = new Vector3().copy(targetPos).sub(owner.position).normalize();
        owner.velocity.add(toTarget.multiplyScalar(10 * 0.016));

        return Goal.STATUS.ACTIVE as unknown as number;
    }

    public terminate(): void {
        // console.log('AttackEnemyGoal terminated');
    }
}
