import { GoalEvaluator, Think } from 'yuka';
import { AttackEnemyGoal } from '../goals/AttackEnemyGoal';
import { GameEntity } from '../core/GameEntity';
import * as THREE from 'three';

// Generic evaluator that works with any GameEntity that has a brain and target
export class AttackEvaluator<T extends GameEntity & { brain: Think<T>; target: { position: THREE.Vector3 } }> extends GoalEvaluator<T> {
    constructor() {
        super();
    }

    public calculateDesirability(owner: T): number {
        return owner ? 1.0 : 0.0;
    }

    public setGoal(owner: T): void {
        // owner.brain.activate(new AttackEnemyGoal(owner, owner.target));
        // Use addSubgoal if activate doesn't take args. Think is a CompositeGoal.
        owner.brain.addSubgoal(new AttackEnemyGoal<T>(owner, owner.target));
    }
}
