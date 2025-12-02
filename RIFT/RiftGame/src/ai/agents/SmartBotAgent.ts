import { Think } from 'yuka';
import * as THREE from 'three';
import { GameEntity } from '../core/GameEntity';
import { EnemyFactory } from '../../entities/EnemyFactory';
import { AttackEvaluator } from '../evaluators/AttackEvaluator';

export class SmartBotAgent extends GameEntity {
    public brain: Think<SmartBotAgent>;
    public target: { position: THREE.Vector3 }; // Public for Evaluator access

    constructor(target: { position: THREE.Vector3 }) {
        const mesh = EnemyFactory.createEnemyMesh('heavy', 0x00FF00); // Green for SmartBot
        super(mesh);
        this.target = target;

        this.brain = new Think(this);
        this.brain.addEvaluator(new AttackEvaluator<SmartBotAgent>());

        this.maxSpeed = 4;
    }

    public update(delta: number): this {
        super.update(delta);
        this.brain.execute();
        this.brain.arbitrate();
        return this;
    }
}
