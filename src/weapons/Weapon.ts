import { GameEntity, MathUtils } from 'yuka';
import { WEAPON_STATUS_READY, WEAPON_STATUS_UNREADY, WEAPON_STATUS_EQUIP, WEAPON_STATUS_HIDE } from '../core/Constants';

/**
* Base class for all weapons.
*/
class Weapon extends GameEntity {

	public owner: any;
	public type: number | null;
	public status: number;
	public previousState: number;
	public roundsLeft: number;
	public roundsPerClip: number;
	public ammo: number;
	public maxAmmo: number;
	public currentTime: number;
	public shotTime: number;
	public reloadTime: number;
	public equipTime: number;
	public hideTime: number;
	public endTimeShot: number;
	public endTimeReload: number;
	public endTimeEquip: number;
	public endTimeHide: number;
	public endTimeMuzzleFire: number;
	public fuzzyModule: any;
	public muzzle: any;
	public audios: any;
	public mixer: any;
	public animations: any;

	/**
	* Constructs a new weapon with the given values.
	*
	* @param {GameEntity} owner - The owner of this weapon.
	*/
	constructor(owner: any) {

		super();

		this.owner = owner;

		this.canActivateTrigger = false;

		this.type = null;
		this.status = WEAPON_STATUS_UNREADY;

		// use to restore the state after a weapon change

		this.previousState = WEAPON_STATUS_READY;

		// ammo related stuff

		this.roundsLeft = 0;
		this.roundsPerClip = 0;
		this.ammo = 0;
		this.maxAmmo = 0;

		// times are in seconds

		this.currentTime = 0;

		this.shotTime = Infinity;
		this.reloadTime = Infinity;
		this.equipTime = Infinity;
		this.hideTime = Infinity;

		this.endTimeShot = Infinity;
		this.endTimeReload = Infinity;
		this.endTimeEquip = Infinity;
		this.endTimeHide = Infinity;
		this.endTimeMuzzleFire = Infinity;

		// used for weapon selection

		this.fuzzyModule = null;

		// render specific properties

		this.muzzle = null;
		this.audios = null;
		this.mixer = null;
		this.animations = null;

	}

	/**
	* Adds the given amount of rounds to the ammo.
	*
	* @param {Number} rounds - The amount of ammo.
	* @return {Weapon} A reference to this weapon.
	*/
	/**
	* Adds the given amount of rounds to the ammo.
	*
	* @param {Number} rounds - The amount of ammo.
	* @return {Weapon} A reference to this weapon.
	*/
	addRounds(rounds: number) {

		this.ammo = MathUtils.clamp(this.ammo + rounds, 0, this.maxAmmo);

		return this;

	}

	/**
	* Returns the remaining rounds/ammo of this weapon.
	*
	* @return {Number} The reamining rounds/ammo for this weapon.
	*/
	getRemainingRounds() {

		return this.ammo;

	}

	/**
	* Returns a value representing the desirability of using the weapon.
	*
	* @param {Number} distance - The distance to the target.
	* @return {Number} A score between 0 and 1 representing the desirability.
	*/
	getDesirability(_distance: number) {

		return 0;

	}

	/**
	* Equips the weapon.
	*
	* @return {Weapon} A reference to this weapon.
	*/
	equip() {

		this.status = WEAPON_STATUS_EQUIP;
		this.endTimeEquip = this.currentTime + this.equipTime;

		if (this.mixer) {

			let animation = this.animations.get('hide');
			animation.stop();

			animation = this.animations.get('equip');
			animation.stop();
			animation.play();

		}

		if (this.owner.isPlayer) {

			this.owner.world.uiManager.updateAmmoStatus();


		}

		return this;

	}

	/**
	* Hides the weapon.
	*
	* @return {Weapon} A reference to this weapon.
	*/
	hide() {

		this.previousState = this.status;
		this.status = WEAPON_STATUS_HIDE;
		this.endTimeHide = this.currentTime + this.hideTime;

		if (this.mixer) {

			const animation = this.animations.get('hide');
			animation.stop();
			animation.play();

		}

		return this;

	}

	/**
	* Reloads the weapon.
	*
	* @return {Weapon} A reference to this weapon.
	*/
	reload() { }

	/**
	* Shoots at the given position.
	*
	* @param {Vector3} targetPosition - The target position.
	* @return {Weapon} A reference to this weapon.
	*/
	shoot(_targetPosition: any) { }

	/**
	* Update method of this weapon.
	*
	* @param {Number} delta - The time delta value;
	* @return {Weapon} A reference to this weapon.
	*/
	update(delta: number) {

		this.currentTime += delta;

		if (this.currentTime >= this.endTimeEquip) {

			this.status = this.previousState; // restore previous state
			this.endTimeEquip = Infinity;

		}

		if (this.currentTime >= this.endTimeHide) {

			this.status = WEAPON_STATUS_UNREADY;
			this.endTimeHide = Infinity;

		}

		// update animations

		if (this.mixer) {

			this.mixer.update(delta);

		}

		return this;

	}

}

export { Weapon };
