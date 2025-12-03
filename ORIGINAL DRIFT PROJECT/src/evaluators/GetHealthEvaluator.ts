import { GoalEvaluator, MathUtils } from 'yuka';
import { Feature } from '../core/Feature';
import { GetItemGoal } from '../goals/GetItemGoal';
import { Enemy } from '../entities/Enemy';
import { HEALTH_PACK } from '../core/Constants';

/**
* Class for representing the get-health goal evaluator. Can be used to compute a score that
* represents the desirability of the respective top-level goal.
*/
class GetHealthEvaluator extends GoalEvaluator<Enemy> {

	public itemType: number;
	public tweaker: number;

	/**
	* Constructs a new get health goal evaluator.
	*
	* @param {Number} characterBias - Can be used to adjust the preferences of the enemy.
	* @param {Number} itemType - The item type.
	*/
	constructor(characterBias = 1, itemType = HEALTH_PACK) {

		super(characterBias);

		this.itemType = itemType;
		this.tweaker = 0.2; // value used to tweak the desirability

	}

	/**
	* Calculates the desirability. It's a score between 0 and 1 representing the desirability
	* of a goal.
	*
	* @param {Enemy} owner - The owner of this goal evaluator.
	* @return {Number} The desirability.
	*/
	calculateDesirability(owner: Enemy) {

		let desirability = 0;

		if (owner.isItemIgnored(this.itemType) === false && owner.health < owner.maxHealth) {

			const distanceScore = Feature.distanceToItem(owner, this.itemType);
			const healthScore = Feature.health(owner);

			desirability = this.tweaker * (1 - healthScore) / distanceScore;

			desirability = MathUtils.clamp(desirability, 0, 1);

		}

		return desirability;

	}

	/**
	* Executed if this goal evaluator produces the highest desirability.
	*
	* @param {Enemy} owner - The owner of this goal evaluator.
	*/
	setGoal(owner: Enemy) {

		const currentSubgoal = owner.brain.currentSubgoal();

		if ((currentSubgoal instanceof GetItemGoal) === false) {

			owner.brain.clearSubgoals();

			owner.brain.addSubgoal(new GetItemGoal(owner, this.itemType));

		}

	}

}

export { GetHealthEvaluator };
