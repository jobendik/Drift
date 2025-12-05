import { EntityManager, Time, MeshGeometry, Vector3, CellSpacePartitioning } from 'yuka';
import * as THREE from 'three';
import { WebGLRenderer, Scene, PerspectiveCamera, Color, AnimationMixer, Object3D, SkeletonHelper, SRGBColorSpace, ShaderMaterial, Vector3 as ThreeVector3, Mesh, Box3, BoxGeometry, MeshBasicMaterial, Fog, FogExp2 } from 'three';
import { HemisphereLight, DirectionalLight, PointLight, SpotLight } from 'three';
import { AxesHelper } from 'three';
import { PostProcessingSystem } from '../systems/PostProcessingSystem';

import { AssetManager } from './AssetManager';
import { SpawningManager } from './SpawningManager';
import { UIManager } from './UIManager';
import { FirstPersonControls } from '../controls/FirstPersonControls';
import { NavMeshUtils } from '../utils/NavMeshUtils';
import { SceneUtils } from '../utils/SceneUtils';
import { Level } from '../entities/Level';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Bullet } from '../weapons/Bullet';
import { PathPlanner } from '../utils/PathPlanner';
import { Sky } from '../effects/Sky';
import { CONFIG } from './Config';
import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, AdditiveBlending } from 'three';

// RIFT Integration imports
import { RIFTIntegration } from '../rift-integration';
import { GameModeManager, GameModeType } from '../gamemodes';
import { NetworkManager } from '../network';
import { LobbyManager, LobbyUI, LobbyEventType } from '../lobby';
import { SurfaceMaterial } from '../systems/DecalSystem';

const currentIntersectionPoint = new Vector3();

/**
* Class for representing the game world. It's the key point where
* the scene and all game entities are created and managed.
*
*/
class World {

	// RIFT Integration systems
	public rift!: RIFTIntegration;
	public postProcessing!: PostProcessingSystem;
	public gameModeManager!: GameModeManager;
	public networkManager!: NetworkManager;
	public lobbyManager!: LobbyManager;
	public lobbyUI!: LobbyUI;

	// Physics collision objects
	public arenaObjects: Array<{ mesh: Mesh; box: Box3 }> = [];

	// Mouse tracking for weapon system
	private mouseMovement: { x: number; y: number } = { x: 0, y: 0 };
	private headBobTime: number = 0;

	// Zoom animation state
	private targetFOV: number = 75;
	private currentFOV: number = 75;
	private readonly baseFOV: number = 75;
	private readonly zoomedFOV: number = 15;
	private readonly fovLerpSpeed: number = 12; // Higher = faster transition
	public zoomTransitionProgress: number = 0;

	// Convenience getter for HUD Manager
	public get hudManager() {
		return this.rift?.hudManager;
	}



	public entityManager: EntityManager;
	public time: Time;
	public tick: number;

	public assetManager!: AssetManager;
	public navMesh: any;
	public costTable: any;
	public pathPlanner!: PathPlanner;
	public spawningManager: SpawningManager;
	public uiManager: UIManager;

	public renderer!: WebGLRenderer;
	public camera!: PerspectiveCamera;
	public scene!: Scene;
	public fpsControls!: FirstPersonControls;
	public useFPSControls: boolean;
	
	// Weather effects
	private rainParticles!: Points;
	private lightningFlashLight!: PointLight;
	private lightningTime: number = 0;
	private nextLightningTime: number = 5 + Math.random() * 10;

	public player!: Player;
	public level!: Level;

	public enemyCount: number;
	public competitors: Array<any>;

	public _animate: () => void;
	public _onWindowResize: () => void;

	public debug: boolean;

	public helpers: {
		convexRegionHelper: Object3D | null;
		spatialIndexHelper: Object3D | null;
		axesHelper: AxesHelper | null;
		graphHelper: Object3D | null;
		pathHelpers: Array<Object3D>;
		spawnHelpers: Object3D | null;
		uuidHelpers: Array<Object3D>;
		skeletonHelpers: Array<SkeletonHelper>;
		itemHelpers: Array<Object3D>;
	};

	constructor() {

		this.entityManager = new EntityManager();
		this.time = new Time();
		this.tick = 0;

		this.spawningManager = new SpawningManager(this);
		this.uiManager = new UIManager(this);

		this.useFPSControls = true;

		this.enemyCount = CONFIG.BOT.COUNT;
		this.competitors = new Array();

		this._animate = this.animate.bind(this);
		this._onWindowResize = this.onWindowResize.bind(this);

		this.debug = false; this.helpers = {
			convexRegionHelper: null,
			spatialIndexHelper: null,
			axesHelper: null,
			graphHelper: null,
			pathHelpers: new Array(),
			spawnHelpers: null,
			uuidHelpers: new Array(),
			skeletonHelpers: new Array(),
			itemHelpers: new Array()
		};

	}

	/**
	* Entry point for the game. It initializes the asset manager and then
	* starts to build the game environment.
	*
	* @return {World} A reference to this world object.
	*/
	init() {

		this.assetManager = new AssetManager();

		this.assetManager.init().then(() => {

			this._initScene();
			this._initLevel();
			this._initEnemies();
			this._initPlayer();
			this._initControls();
			this._initUI();

			this._animate();

		});

		return this;

	}

	/**
	* Adds the given game entity to the game world. This means it is
	* added to the entity manager and to the scene if it has a render component.
	*
	* @param {GameEntity} entity - The game entity to add.
	* @return {World} A reference to this world object.
	*/
	add(entity: any): this {

		this.entityManager.add(entity);

		if (entity._renderComponent !== null) {

			this.scene.add(entity._renderComponent);

		}

		return this;

	}

	/**
	* Removes the given game entity from the game world. This means it is
	* removed from the entity manager and from the scene if it has a render component.
	*
	* @param {GameEntity} entity - The game entity to remove.
	* @return {World} A reference to this world object.
	*/
	remove(entity: any): this {

		this.entityManager.remove(entity);

		if (entity._renderComponent !== null) {

			this.scene.remove(entity._renderComponent);

		}

		return this;

	}

	/**
	* Adds a bullet to the game world. The bullet is defined by the given
	* parameters and created by the method.
	*
	* @param {GameEntity} owner - The owner of the bullet.
	* @param {Ray} ray - The ray that defines the trajectory of this bullet.
	* @return {World} A reference to this world object.
	*/
	addBullet(owner: any, ray: any): this {

		const bulletLine = this.assetManager.models.get('bulletLine').clone();
		bulletLine.visible = false;

		const bullet = new Bullet(owner, ray);
		bullet.setRenderComponent(bulletLine, sync);

		this.add(bullet);

		return this;

	}

	/**
	* The method checks if compatible game entities intersect with a projectile.
	* The closest hitted game entity is returned. If no intersection is detected,
	* null is returned. A possible intersection point is stored into the second parameter.
	*
	* @param {Projectile} projectile - The projectile.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {GameEntity} The hitted game entity.
	*/
	checkProjectileIntersection(projectile: any, intersectionPoint: any) {

		const entities = this.entityManager.entities;
		let minDistance = Infinity;
		let hittedEntity = null;
		let hitNormal = null;

		const owner = projectile.owner;
		const ray = projectile.ray;

		for (let i = 0, l = entities.length; i < l; i++) {

			const entity = entities[i] as any;

			// do not test with the owner entity and only process entities with the correct interface

			if (entity !== owner && entity.active && entity.checkProjectileIntersection) {

				if (entity.checkProjectileIntersection(ray, currentIntersectionPoint) !== null) {

					const squaredDistance = currentIntersectionPoint.squaredDistanceTo(ray.origin);

					if (squaredDistance < minDistance) {

						minDistance = squaredDistance;
						hittedEntity = entity;

						intersectionPoint.copy(currentIntersectionPoint);
						
						// For level hits, calculate normal for decals
						if (entity === this.level) {
							// Approximate normal from ray direction (will be improved with proper BVH normal extraction)
							hitNormal = new Vector3().copy(ray.direction).multiplyScalar(-1).normalize();
						}

					}

				}


			}

		}

		// Store hit normal for decal creation
		if (hitNormal && hittedEntity === this.level) {
			(projectile as any)._lastHitNormal = hitNormal;
		}

		return hittedEntity;

	}

	/**
	* Finds the nearest item of the given item type for the given entity.
	*
	* @param {GameEntity} entity - The entity which searches for the item.
	* @param {Number} itemType - The requested item type.
	* @param {Object} result - The result object containing the item and the distance to it.
	* @return {Object} - The result object containing the item and the distance to it.
	*/
	getClosestItem(entity: any, itemType: any, result: any): any {

		// pick correct item list

		let itemList = this.spawningManager.getItemList(itemType);

		// determine closest item

		let closestItem = null;
		let minDistance = Infinity;

		if (itemList) {
			for (let i = 0, l = itemList.length; i < l; i++) {

				const item = itemList[i];

				// consider only active items

				if (item.active) {

					const fromRegion = entity.currentRegion;
					const toRegion = item.currentRegion;

					const from = this.navMesh.getNodeIndex(fromRegion);
					const to = this.navMesh.getNodeIndex(toRegion);

					// use lookup table to find the distance between two nodes

					const distance = this.costTable.get(from, to);

					if (distance < minDistance) {

						minDistance = distance;
						closestItem = item;

					}

				}

			}
		}

		//

		result.item = closestItem;
		result.distance = minDistance;

		return result;

	}

	/**
	* Inits all basic objects of the scene like the scene graph itself, the camera, lights
	* or the renderer.
	*
	* @return {World} A reference to this world object.
	*/
	_initScene() {

		// scene

		this.scene = new Scene();
		this.scene.background = new Color(0xffffff);

		// camera

		this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000);
		this.camera.position.set(0, 7.5, 10);
		this.camera.add(this.assetManager.listener);
		this.scene.add(this.camera); // Fix: Add camera to scene so its children (weapons) are rendered

		// helpers

		if (this.debug) {

			this.helpers.axesHelper = new AxesHelper(5);
			this.helpers.axesHelper.visible = false;
			this.scene.add(this.helpers.axesHelper);

		}

		// === DRAMATIC ARENA LIGHTING ===

		// Atmospheric fog for depth
		this.scene.fog = new FogExp2(0x4a5560, 0.004);
		this.scene.background = new Color(0x3a4550); // Dark stormy sky

		// Hemisphere light - overcast atmosphere
		const hemiLight = new HemisphereLight(0x8090a0, 0x606870, 0.5);
		hemiLight.position.set(0, 100, 0);
		this.scene.add(hemiLight);

		// Main directional light (diffused through clouds) with shadows
		const dirLight = new DirectionalLight(0xd0e0f0, 1.8); // Brighter for contrast
		dirLight.position.set(-700, 1000, -750);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 2048;
		dirLight.shadow.mapSize.height = 2048;
		dirLight.shadow.camera.near = 100;
		dirLight.shadow.camera.far = 2500;
		dirLight.shadow.camera.left = -500;
		dirLight.shadow.camera.right = 500;
		dirLight.shadow.camera.top = 500;
		dirLight.shadow.camera.bottom = -500;
		dirLight.shadow.bias = -0.0005;
		this.scene.add(dirLight);

		// Dramatic ambient lighting for gameplay visibility
		// Cool backlight for atmosphere
		const backLight = new PointLight(0x8090b0, 1.8, 180, 1.8);
		backLight.position.set(-40, 12, -30);
		this.scene.add(backLight);

		// Warm contrast light
		const warmAccent = new PointLight(0xc09070, 1.2, 150, 2.0);
		warmAccent.position.set(40, 12, 30);
		this.scene.add(warmAccent);

		// Strong ambient fill for competitive visibility
		const ambientFill = new PointLight(0x90a0b0, 1.4, 200, 2.0);
		ambientFill.position.set(0, 15, 0);
		this.scene.add(ambientFill);

		// sky

		const sky = new Sky();
		sky.scale.setScalar(1000);

		const skyMaterial = sky.material as ShaderMaterial;
		skyMaterial.uniforms.turbidity.value = 12; // Heavy overcast
		skyMaterial.uniforms.rayleigh.value = 0.5; // Reduced scattering
		skyMaterial.uniforms.skyLuminance.value = 0.4; // Darker sky
		skyMaterial.uniforms.sunPosition.value.set(-700, 400, -750); // Lower sun position
		
		// Store sky reference for animation
		(this as any).sky = sky;

		this.scene.add(sky);
		
		// === WEATHER EFFECTS ===
		this._initWeatherEffects();

		// renderer

		this.renderer = new WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.autoClear = false;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.0;
		document.body.appendChild(this.renderer.domElement);

		// event listeners

		window.addEventListener('resize', this._onWindowResize, false);

		// Initialize RIFT Integration systems
		this._initRIFT();

		// Initialize post-processing (after RIFT so scene is ready)
		this.postProcessing = new PostProcessingSystem(this.renderer, this.scene, this.camera);

		return this;

	}

	/**
	* Creates a specific amount of enemies.
	*
	* @return {World} A reference to this world object.
	*/
	_initEnemies() {

		const enemyCount = this.enemyCount;
		const navMesh = this.assetManager.navMesh;

		this.pathPlanner = new PathPlanner(navMesh);

		for (let i = 0; i < enemyCount; i++) {

			const renderComponent = SceneUtils.cloneWithSkinning(this.assetManager.models.get('soldier'));

			const enemy = new Enemy(this);
			enemy.name = 'Bot' + i;
			enemy.setRenderComponent(renderComponent, sync);

			// Link render component to entity for raycasting
			renderComponent.userData.entity = enemy;
			// Set userData on ALL children (not just meshes) for reliable hit detection
			renderComponent.traverse((child: any) => {
				child.userData.entity = enemy;
			});

			// set animations

			const mixer = new AnimationMixer(renderComponent);

			const idleClip = this.assetManager.animations.get('soldier_idle');
			const runForwardClip = this.assetManager.animations.get('soldier_forward');
			const runBackwardClip = this.assetManager.animations.get('soldier_backward');
			const strafeLeftClip = this.assetManager.animations.get('soldier_left');
			const strafeRightClip = this.assetManager.animations.get('soldier_right');
			const death1Clip = this.assetManager.animations.get('soldier_death1');
			const death2Clip = this.assetManager.animations.get('soldier_death2');

			const clips = [idleClip, runForwardClip, runBackwardClip, strafeLeftClip, strafeRightClip, death1Clip, death2Clip];

			enemy.setAnimations(mixer, clips);

			//

			this.add(enemy);
			this.competitors.push(enemy);
			this.spawningManager.respawnCompetitor(enemy);

			//

			if (this.debug) {

				const pathHelper = NavMeshUtils.createPathHelper();
				enemy.pathHelper = pathHelper;

				this.scene.add(pathHelper);
				this.helpers.pathHelpers.push(pathHelper);

				//

				const uuidHelper = SceneUtils.createUUIDLabel(enemy.uuid);
				uuidHelper.position.y = 2;
				uuidHelper.visible = false;

				renderComponent.add(uuidHelper);
				this.helpers.uuidHelpers.push(uuidHelper);

				//

				const skeletonHelper = new SkeletonHelper(renderComponent);
				skeletonHelper.visible = false;

				this.scene.add(skeletonHelper);
				this.helpers.skeletonHelpers.push(skeletonHelper);

			}

		}

		return this;

	}

	/**
	* Creates the actual level.
	*
	* @return {World} A reference to this world object.
	*/
	_initLevel() {

		// level entity

		const renderComponent = this.assetManager.models.get('level');
		const mesh = renderComponent.getObjectByName('level');

		const vertices = mesh.geometry.attributes.position.array;
		const indices = mesh.geometry.index.array;

		const geometry = new MeshGeometry(vertices, indices);
		const level = new Level(geometry);
		level.name = 'level';
		level.setRenderComponent(renderComponent, sync);

		// Set userData.entity on level for consistent entity lookup
		renderComponent.userData.entity = level;
		renderComponent.traverse((child: any) => {
			child.userData.entity = level;
		});

		this.level = level;
		this.add(level);

		// Populate arenaObjects for physics collision
		this.arenaObjects = [];
		
		// Ensure world matrices are updated before computing boxes
		renderComponent.updateMatrixWorld(true);

		// We no longer create Box3 for the level mesh because it's concave and causes
		// the player to float on top of the bounding box.
		// Instead, Player.ts will use the Level entity's BVH for precise collision.
		
		// Only add other objects if needed
		/*
		renderComponent.traverse((object: any) => {
			if (object.isMesh) {
				const box = new Box3().setFromObject(object);
				this.arenaObjects.push({ mesh: object as Mesh, box: box });
			}
		});
		*/
		console.log('Total arenaObjects:', this.arenaObjects.length);

		// navigation mesh

		this.navMesh = this.assetManager.navMesh;
		this.costTable = this.assetManager.costTable;

		// spatial index

		const levelConfig = this.assetManager.configs.get('level');

		const width = levelConfig.spatialIndex.width;
		const height = levelConfig.spatialIndex.height;
		const depth = levelConfig.spatialIndex.depth;
		const cellsX = levelConfig.spatialIndex.cellsX;
		const cellsY = levelConfig.spatialIndex.cellsY;
		const cellsZ = levelConfig.spatialIndex.cellsZ;

		this.navMesh.spatialIndex = new CellSpacePartitioning(width, height, depth, cellsX, cellsY, cellsZ);
		this.navMesh.updateSpatialIndex();

		this.helpers.spatialIndexHelper = NavMeshUtils.createCellSpaceHelper(this.navMesh.spatialIndex);
		this.scene.add(this.helpers.spatialIndexHelper);

		// init spawning points and items

		this.spawningManager.init();

		// debugging

		if (this.debug) {

			this.helpers.convexRegionHelper = NavMeshUtils.createConvexRegionHelper(this.navMesh);
			this.scene.add(this.helpers.convexRegionHelper);

			//

			this.helpers.graphHelper = NavMeshUtils.createGraphHelper(this.navMesh.graph, 0.2);
			this.scene.add(this.helpers.graphHelper);

			//

			this.helpers.spawnHelpers = SceneUtils.createSpawnPointHelper(this.spawningManager.spawningPoints);
			this.scene.add(this.helpers.spawnHelpers);

		}

		return this;

	}

	/**
	* Creates the player instance.
	*
	* @return {World} A reference to this world object.
	*/
	_initPlayer() {

		const assetManager = this.assetManager;

		const player = new Player(this);

		// render component

		const body = new Object3D(); // dummy 3D object for adding spatial audios
		body.matrixAutoUpdate = false;
		
		// Add invisible collision mesh for raycast hit detection by enemies
		// Player is 1.8m tall, 0.5m radius (diameter 1m)
		const collisionGeometry = new BoxGeometry(0.5, 1.8, 0.5);
		const collisionMaterial = new MeshBasicMaterial({ visible: false });
		const collisionMesh = new Mesh(collisionGeometry, collisionMaterial);
		collisionMesh.position.y = 0.9; // Center at half player height
		collisionMesh.name = 'playerCollision';
		collisionMesh.userData.entity = player; // Link to player entity for damage
		body.add(collisionMesh);
		
		player.setRenderComponent(body, sync);

		// audio

		const step1 = assetManager.cloneAudio(assetManager.audios.get('step1')!);
		const step2 = assetManager.cloneAudio(assetManager.audios.get('step2')!);

		// the following audios are unique and will be used only for the player (no cloning needed)

		const impact1 = assetManager.audios.get('impact1')!;
		const impact2 = assetManager.audios.get('impact2')!;
		const impact3 = assetManager.audios.get('impact3')!;
		const impact4 = assetManager.audios.get('impact4')!;
		const impact5 = assetManager.audios.get('impact5')!;
		const impact6 = assetManager.audios.get('impact6')!;
		const impact7 = assetManager.audios.get('impact7')!;

		step1.setVolume(0.5);
		step2.setVolume(0.5);

		body.add(step1, step2);
		body.add(impact1, impact2, impact3, impact4, impact5, impact6, impact7);

		player.audios.set('step1', step1);
		player.audios.set('step2', step2);
		player.audios.set('impact1', impact1);
		player.audios.set('impact2', impact2);
		player.audios.set('impact3', impact3);
		player.audios.set('impact4', impact4);
		player.audios.set('impact5', impact5);
		player.audios.set('impact6', impact6);
		player.audios.set('impact7', impact7);

		// animation

		const mixer = new AnimationMixer(player.head as any);

		const deathClip = this.assetManager.animations.get('player_death');

		const clips = [deathClip];

		player.setAnimations(mixer, clips);

		// add the player to the world

		this.add(player);
		this.competitors.push(player);
		this.spawningManager.respawnCompetitor(player);

		// in dev mode we start with orbit controls

		if (this.debug) {

			player.deactivate();

		}

		//

		this.player = player;

		// Start default game mode now that player exists
		if (this.gameModeManager) {
			this.gameModeManager.setMode(GameModeType.WAVE_SURVIVAL);
		}

		return this;

	}

	/**
	* Inits the controls used by the player.
	*
	* @return {World} A reference to this world object.
	*/
	_initControls() {

		this.fpsControls = new FirstPersonControls(this.player);
		this.fpsControls.sync();

		// Attach camera immediately so we see the world even before locking
		this.camera.matrixAutoUpdate = false;
		this.player.activate();
		this.player.head.setRenderComponent(this.camera, syncCamera);

		// Show RIFT HUD immediately
		if (this.rift) {
			this.rift.hudManager.show();
			console.log('RIFT HUD shown');
		}

		this.fpsControls.addEventListener('lock', () => {

			// Hide old Drift UI
			const oldAmmo = document.getElementById('hudAmmo');
			const oldHealth = document.getElementById('hudHealth');
			const oldFragList = document.getElementById('hudFragList');
			if (oldAmmo) oldAmmo.style.display = 'none';
			if (oldHealth) oldHealth.style.display = 'none';
			if (oldFragList) oldFragList.style.display = 'none';

		});

		this.fpsControls.addEventListener('unlock', () => {

			// Optional: Detach camera on unlock? 
			// For now, let's keep it attached so the view doesn't jump to the sky
			// this.camera.matrixAutoUpdate = true;
			// this.player.deactivate();
			// (this.player.head as any).setRenderComponent(null, null);

			this.uiManager.hideFPSInterface();

			// Hide RIFT HUD
			// if (this.rift) {
			// 	this.rift.hudManager.hide();
			// }

		});

		// Connect controls (adds listeners)
		this.fpsControls.connect();

		return this;

	}	/**
	* Inits the user interface.
	*
	* @return {World} A reference to this world object.
	*/
	_initUI() {

		this.uiManager.init();

		// Show RIFT HUD
		if (this.rift) {
			this.rift.hudManager.show();
		}

		return this;

	}

	/**
	* Initializes the RIFT integration systems.
	* This includes weapon effects, HUD, audio, game modes, network, and lobby.
	*
	* @return {World} A reference to this world object.
	*/
	_initRIFT() {

		// Initialize main RIFT integration (particles, weapons, decals, tracers, HUD, audio)
		this.rift = new RIFTIntegration(this.scene, this.camera, this.assetManager.listener, this.assetManager);

		// Initialize Game Mode Manager
		this.gameModeManager = new GameModeManager(this, this.rift.hudManager);

		// Initialize Network Manager for multiplayer
		this.networkManager = new NetworkManager(this.scene);

		// Initialize Lobby Manager
		this.lobbyManager = new LobbyManager();
		this.lobbyUI = new LobbyUI(this.lobbyManager);

		// Setup lobby event handlers
		this._setupLobbyEvents();

		// Setup shell ejection callback for weapon system
		this.rift.weaponSystem.setShellEjectCallback((pos, dir) => {
			// Ground level is the player's Y position (player.position is at feet level)
			// The player entity position represents the feet, head is offset by player.height
			const groundLevel = this.player.position.y;
			this.rift.particleSystem.spawnShellCasing(pos, dir, groundLevel);
		});

		// Setup shell bounce sound callback
		this.rift.particleSystem.setShellBounceCallback((position, bounceNumber) => {
			// Play shell drop sound with decreasing volume for each bounce
			// First bounce is loudest, subsequent bounces are quieter
			const volumeScale = Math.max(0.3, 1.0 - (bounceNumber - 1) * 0.25);
			
			// Only play sound for first 4 bounces to avoid audio spam
			if (bounceNumber <= 4) {
				this.rift.impactSystem.playShellDrop(position, volumeScale);
			}
		});

		// Setup zoom callback for sniper scope overlay
		this.rift.weaponSystem.setZoomCallback((isZoomed) => {
			// Set target FOV for smooth interpolation
			this.targetFOV = isZoomed ? this.zoomedFOV : this.baseFOV;
			
			// Toggle HUD sniper scope overlay (CSS handles fade animation)
			this.rift.hudManager.toggleScope(isZoomed);
		});

		// Equip default weapon (AK47)
		this.rift.weaponSystem.switchWeapon(0);

		// Note: Game mode initialization moved to _initPlayer() since it requires player to exist

		console.log('RIFT Integration initialized successfully');

		// Remove any old Drift weapon meshes from the scene
		const oldWeaponNames = ['blaster_high', 'shotgun_high', 'assaultRifle_high'];
		const meshesToRemove: any[] = [];

		this.scene.traverse((object: any) => {
			if (object.isMesh && oldWeaponNames.some(name => object.name?.includes(name))) {
				meshesToRemove.push(object);
			}
			// Also check parent objects that might be the weapon groups
			if (object.isGroup && object.children.length > 0) {
				const hasWeaponMesh = object.children.some((child: any) =>
					child.isMesh && oldWeaponNames.some(name => child.name?.includes(name))
				);
				if (hasWeaponMesh) {
					meshesToRemove.push(object);
				}
			}
		});

		meshesToRemove.forEach(mesh => {
			this.scene.remove(mesh);
			console.log('Removed old Drift weapon from scene:', mesh.name || mesh.type);
		});

		console.log(`Removed ${meshesToRemove.length} old weapon meshes from scene`);

		return this;

	}

	/**
	* Sets up event handlers for the lobby system.
	*/
	private _setupLobbyEvents(): void {
		// Handle match found
		this.lobbyManager.on(LobbyEventType.MATCH_FOUND, (data) => {
			console.log('Match found!', data);
		});

		// Handle match starting
		this.lobbyManager.on(LobbyEventType.MATCH_STARTING, async (data: unknown) => {
			const matchData = data as { serverUrl: string; token: string; matchId: string; modeId: string };

			// Connect to game server
			const connected = await this.networkManager.connect(
				matchData.serverUrl,
				matchData.token,
				matchData.matchId
			);

			if (connected) {
				this.lobbyUI.hide();
				this._startMultiplayerGame(matchData.modeId);
			}
		});

		// Handle queue updates
		this.lobbyManager.on(LobbyEventType.QUEUE_UPDATE, (status) => {
			console.log('Queue update:', status);
		});
	}

	/**
	* Starts a multiplayer game with the specified mode.
	*/
	private _startMultiplayerGame(modeId: string): void {
		const modeMap: { [key: string]: GameModeType } = {
			'ffa': GameModeType.FREE_FOR_ALL,
			'tdm': GameModeType.TEAM_DEATHMATCH,
			'wave': GameModeType.WAVE_SURVIVAL
		};

		const gameMode = modeMap[modeId] || GameModeType.FREE_FOR_ALL;
		this.gameModeManager.setMode(gameMode);
	}

	/**
	* Handles RIFT weapon shooting with visual effects.
	* Call this when player shoots to create tracers, impacts, and decals.
	*/
	public handleRiftShot(hitPoint: Vector3 | null, hitNormal: Vector3 | null, hitEntity: any): void {
		const muzzlePos = this.rift.weaponSystem.getMuzzleWorldPosition();

		if (hitPoint) {
			// Convert Yuka Vector3 to Three.js Vector3
			const threeHitPoint = new ThreeVector3(hitPoint.x, hitPoint.y, hitPoint.z);
			this.rift.tracerSystem.createTracer(muzzlePos, threeHitPoint);

			// Create impact effects
			if (hitNormal) {
				const threeNormal = new ThreeVector3(hitNormal.x, hitNormal.y, hitNormal.z);

				if (hitEntity instanceof Enemy) {
					// Enemy hit - blood particles
					this.rift.particleSystem.spawnImpactEffect(threeHitPoint, false);
					this.rift.hudManager.showHitmarker(hitEntity.health <= 0);
				} else {
					// Environment hit - bullet hole and sparks
					this.rift.decalSystem.createDecal(threeHitPoint, threeNormal, SurfaceMaterial.ROCK);
					this.rift.particleSystem.spawnMaterialImpact(threeHitPoint, threeNormal, SurfaceMaterial.ROCK);
					// Play surface impact sound at reduced volume
					this.rift.impactSystem.playSurfaceImpact(threeHitPoint, SurfaceMaterial.ROCK);
				}
			}
		}
	}

	public onWindowResize() {

		const width = window.innerWidth;
		const height = window.innerHeight;

		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(width, height);
		this.uiManager.setSize(width, height);
		
		// Update post-processing resolution
		if (this.postProcessing) {
			this.postProcessing.setSize(width, height);
		}

	}

	public animate() {

		requestAnimationFrame(this._animate);

		this.time.update();

		this.tick++;

		const delta = this.time.getDelta();

		if (this.debug) {

			if (this.useFPSControls) {

				this.fpsControls.update(delta);

			}

		} else {

			this.fpsControls.update(delta);

		}

		this.spawningManager.update(delta);

		this.entityManager.update(delta);

		// Sync render components (visuals) with entity logic
		// This is crucial for Player.head -> Camera sync
		for (const entity of this.entityManager.entities) {
			this._syncRenderComponent(entity);
		}

		this.pathPlanner.update();

		// Update RIFT systems
		this._updateRIFT(delta);
		
		// Update weather effects
		this._updateWeather(delta);

		this.renderer.clear();

		// Use post-processing if available, otherwise direct render
		if (this.postProcessing) {
			this.postProcessing.render();
		} else {
			this.renderer.render(this.scene, this.camera);
		}

		this.uiManager.update(delta);

	}

	/**
	* Updates all RIFT integration systems.
	*
	* @param {Number} delta - The time delta.
	*/
	private _updateRIFT(delta: number): void {
		if (!this.rift) return;

		// Smooth FOV interpolation for zoom animation
		if (Math.abs(this.currentFOV - this.targetFOV) > 0.01) {
			this.currentFOV += (this.targetFOV - this.currentFOV) * Math.min(1, delta * this.fovLerpSpeed);
			this.camera.fov = this.currentFOV;
			this.camera.updateProjectionMatrix();
			
			// Track zoom progress for other effects (0 = unzoomed, 1 = zoomed)
			this.zoomTransitionProgress = 1 - (this.currentFOV - this.zoomedFOV) / (this.baseFOV - this.zoomedFOV);
		}

		// Track head bob time for weapon animation
		const speed = this.player?.velocity ?
			Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2) : 0;
		
		if (speed > 0.1) {
			// Walking/running bob
			this.headBobTime += delta * speed * 2.0;
		} else {
			// Idle breathing
			this.headBobTime += delta * 2.0;
		}

		// Use actual sprint input from controls
		const isSprinting = this.fpsControls?.input?.sprint ?? false;

		// Update all RIFT visual systems (particles, decals, tracers, weapon system)
		this.rift.particleSystem.update(delta);
		this.rift.decalSystem.update(delta);
		this.rift.tracerSystem.update(delta);
		this.rift.weaponSystem.update(delta, this.mouseMovement, isSprinting, this.headBobTime);
		this.rift.screenEffects.update(delta);
		this.rift.hudManager.updateKillfeed(delta);

		// Apply camera recoil to player's head rotation
		const recoil = this.rift.getCameraRecoil();
		if (this.fpsControls && (Math.abs(recoil.pitch) > 0.0001 || Math.abs(recoil.yaw) > 0.0001)) {
			// Apply recoil to the controls' movement values
			this.fpsControls.movementY -= recoil.pitch * delta * 0.5;
			this.fpsControls.movementX -= recoil.yaw * delta * 0.5;
			
			// Clamp pitch
			const PI05 = Math.PI / 2;
			this.fpsControls.movementY = Math.max(-PI05, Math.min(PI05, this.fpsControls.movementY));
		}

		// Apply screen shake offset to camera
		const shakeOffset = this.rift.getShakeOffset();
		if (shakeOffset.length() > 0.0001) {
			// Apply shake relative to camera orientation
			const shakeWorld = shakeOffset.clone();
			shakeWorld.applyQuaternion(this.camera.quaternion);
			this.camera.position.add(shakeWorld);
		}

		// Update HUD with player state
		if (this.player) {
			// Update health
			this.rift.hudManager.updateHealth(this.player.health, this.player.maxHealth);
		}

		// Update weapon HUD from RIFT weapon system
		const config = this.rift.weaponSystem.currentConfig;
		this.rift.hudManager.updateWeaponName(config.name);
		this.rift.hudManager.updateAmmo(this.rift.weaponSystem.currentMag, this.rift.weaponSystem.reserveAmmo);
		this.rift.hudManager.showReloading(this.rift.weaponSystem.isReloading);
		this.rift.hudManager.updateCrosshair(this.rift.weaponSystem.getCurrentSpread());

		// Update game mode
		if (this.gameModeManager) {
			this.gameModeManager.update(delta);
		}

		// Update network (multiplayer sync)
		if (this.networkManager && this.player) {
			this.networkManager.update(delta, this.player as any, this.camera);
		}

		// Reset mouse movement for next frame
		this.mouseMovement.x = 0;
		this.mouseMovement.y = 0;
	}

	/**
	* Called from FirstPersonControls when mouse moves.
	* Updates the mouse movement tracking for weapon system.
	*/
	public onMouseMove(movementX: number, movementY: number): void {
		this.mouseMovement.x = movementX;
		this.mouseMovement.y = movementY;
	}

	/**
	 * Recursively syncs the render component of an entity and its children.
	 * 
	 * @param {GameEntity} entity - The entity to sync.
	 */
	private _syncRenderComponent(entity: any): void {
		if (entity.renderComponent) {
			// If a custom callback is defined (like for Camera), use it
			if (entity._renderComponentCallback) {
				entity._renderComponentCallback(entity, entity.renderComponent);
			} else {
				// Default sync: copy world matrix
				entity.renderComponent.matrix.copy(entity.worldMatrix);
			}
		}

		// Recursively sync children (e.g. Player -> Head -> Camera)
		if (entity.children) {
			for (const child of entity.children) {
				this._syncRenderComponent(child);
			}
		}
	}
	
	/**
	* Initialize weather effects - rain and lightning
	*/
	private _initWeatherEffects(): void {
		// Rain particles
		const rainCount = 3000;
		const rainGeometry = new THREE.BufferGeometry();
		const rainPositions = new Float32Array(rainCount * 3);
		const rainVelocities = new Float32Array(rainCount);
		
		for (let i = 0; i < rainCount; i++) {
			// Spread rain around camera
			rainPositions[i * 3] = (Math.random() - 0.5) * 200; // x
			rainPositions[i * 3 + 1] = Math.random() * 80 - 10; // y (height)
			rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 200; // z
			rainVelocities[i] = 30 + Math.random() * 20; // fall speed
		}
		
		rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
		rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(rainVelocities, 1));
		
		const rainMaterial = new THREE.PointsMaterial({
			color: 0x8899aa,
			size: 0.15,
			transparent: true,
			opacity: 0.6,
			blending: THREE.AdditiveBlending
		});
		
		this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
		this.scene.add(this.rainParticles);
		
		// Lightning flash light (starts off)
		this.lightningFlashLight = new THREE.PointLight(0xccddff, 0, 400, 1.5); // Brighter color, wider range
		this.lightningFlashLight.position.set(0, 100, 0);
		this.lightningFlashLight.castShadow = false; // Don't cast shadows for performance
		this.scene.add(this.lightningFlashLight);
	}
	
	/**
	* Update weather effects each frame
	*/
	private _updateWeather(delta: number): void {
		// Animate sky clouds
		const sky = (this as any).sky;
		if (sky) {
			const skyMaterial = sky.material as ShaderMaterial;
			skyMaterial.uniforms.time.value += delta;
		}
		
		// Update rain
		const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
		const velocities = this.rainParticles.geometry.attributes.velocity.array as Float32Array;
		
		for (let i = 0; i < positions.length / 3; i++) {
			// Move rain down
			positions[i * 3 + 1] -= velocities[i] * delta;
			
			// Reset rain when it hits ground
			if (positions[i * 3 + 1] < -5) {
				positions[i * 3 + 1] = 70 + Math.random() * 10;
				positions[i * 3] = this.camera.position.x + (Math.random() - 0.5) * 200;
				positions[i * 3 + 2] = this.camera.position.z + (Math.random() - 0.5) * 200;
			}
		}
		
		this.rainParticles.geometry.attributes.position.needsUpdate = true;
		
		// Update lightning
		this.lightningTime += delta;
		
		if (this.lightningTime >= this.nextLightningTime) {
			// Trigger INTENSE lightning flash
			this.lightningFlashLight.intensity = 80 + Math.random() * 40; // MUCH brighter (80-120)
			this.lightningFlashLight.position.set(
				(Math.random() - 0.5) * 120, // Closer to player
				80 + Math.random() * 30, // Higher up
				(Math.random() - 0.5) * 120
			);
			
			// Sometimes create double-strike effect
			if (Math.random() > 0.7) {
				setTimeout(() => {
					this.lightningFlashLight.intensity = 50 + Math.random() * 30;
				}, 100 + Math.random() * 100);
			}
			
			// Brief screen flash effect using vignette
			if (this.rift?.screenEffects) {
				this.rift.screenEffects.addVignette(0.3); // Quick bright flash
			}
			
			// Schedule next lightning - more frequent
			this.lightningTime = 0;
			this.nextLightningTime = 2 + Math.random() * 5; // 2-7 seconds instead of 3-11
		} else if (this.lightningFlashLight.intensity > 0) {
			// Fade out lightning with realistic flicker
			const fadeSpeed = 12 + Math.random() * 3;
			this.lightningFlashLight.intensity *= Math.max(0, 1 - delta * fadeSpeed);
			
			// Add flicker before complete fade
			if (this.lightningFlashLight.intensity < 5 && Math.random() > 0.9) {
				this.lightningFlashLight.intensity += 3;
			}
			
			if (this.lightningFlashLight.intensity < 0.1) {
				this.lightningFlashLight.intensity = 0;
			}
		}
	}

}

function sync(entity: any, renderComponent: any) {

	renderComponent.matrix.copy(entity.worldMatrix);

}

function syncCamera(entity: any, camera: any) {
	// Copy the entity's world matrix to camera's matrixWorld and decompose to update position/rotation
	camera.matrixWorld.copy(entity.worldMatrix);
	
	// Decompose the world matrix to update camera's position and quaternion
	camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
	
	// Update the local matrix as well
	camera.matrix.copy(entity.worldMatrix);
}

export default new World();
