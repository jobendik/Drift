import { LoadingManager, AnimationLoader, AudioLoader, TextureLoader, Mesh, AnimationClip, Texture, ShaderMaterial, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import { Sprite, SpriteMaterial, DoubleSide, AudioListener, PositionalAudio } from 'three';
import { LineSegments, LineBasicMaterial, MeshBasicMaterial, BufferGeometry, Vector3, PlaneGeometry } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NavMeshLoader, CostTable } from 'yuka';
import { CONFIG } from './Config';

/**
* Class for representing the global asset manager. It is responsible
* for loading and parsing all assets from the backend and provide
* the result in a series of maps.
*
*/
class AssetManager {

	public loadingManager: LoadingManager;
	public animationLoader: AnimationLoader;
	public audioLoader: AudioLoader;
	public textureLoader: TextureLoader;
	public gltfLoader: GLTFLoader;
	public navMeshLoader: NavMeshLoader;

	public listener: AudioListener;

	public animations: Map<string, AnimationClip>;
	public audios: Map<string, PositionalAudio>;
	public configs: Map<string, any>;
	public models: Map<string, any>;
	public textures: Map<string, Texture>;

	public navMesh: any;
	public costTable: any;

	/**
	* Constructs a new asset manager with the given values.
	*/
	constructor() {

		this.loadingManager = new LoadingManager();

		this.animationLoader = new AnimationLoader(this.loadingManager);
		this.audioLoader = new AudioLoader(this.loadingManager);
		this.textureLoader = new TextureLoader(this.loadingManager);
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.navMeshLoader = new NavMeshLoader();

		this.listener = new AudioListener();

		this.animations = new Map();
		this.audios = new Map();
		this.configs = new Map();
		this.models = new Map();
		this.textures = new Map();

		this.navMesh = null;
		this.costTable = null;

	}

	/**
	* Initializes the asset manager. All assets are prepared so they
	* can be used by the game.
	*
	* @return {Promise} Resolves when all assets are ready.
	*/
	init() {

		this._loadAnimations();
		this._loadAudios();
		this._loadConfigs();
		this._loadTextures();  // Load textures BEFORE models so they're available
		this._loadModels();
		this._loadNavMesh();

		return new Promise((resolve) => {

			this.loadingManager.onLoad = () => {
				// Apply level material after ALL assets (including textures) are loaded
				this._applyLevelMaterial();
				resolve(undefined);

			};

		});

	}
	
	/**
	* Applies the triplanar textured material to the level mesh.
	* Called after all assets are loaded to ensure textures are available.
	*/
	_applyLevelMaterial() {
		const level = this.models.get('level');
		if (!level) return;
		
		const mesh = level.getObjectByName('level') as Mesh;
		if (!mesh || !mesh.material) return;
		
		const oldMaterial = mesh.material as MeshBasicMaterial;
		
		// Get floor textures (metal plates)
		const floorColor = this.textures.get('floor_color');
		const floorNormal = this.textures.get('floor_normal');
		const floorRoughness = this.textures.get('floor_roughness');
		const floorAO = this.textures.get('floor_ao');
		const floorMetallic = this.textures.get('floor_metallic');
		
		// Get 2 brick wall texture variations (within WebGL texture unit limit)
		const wallColors: any[] = [];
		const wallNormals: any[] = [];
		const wallRoughnesses: any[] = [];
		const wallAOs: any[] = [];
		
		for (let i = 1; i <= 2; i++) {
			wallColors.push(this.textures.get(`wall_color_${i}`));
			wallNormals.push(this.textures.get(`wall_normal_${i}`));
			wallRoughnesses.push(this.textures.get(`wall_roughness_${i}`));
			wallAOs.push(this.textures.get(`wall_ao_${i}`));
		}
		
		// Check if all textures loaded
		if (!floorColor || !wallColors[0]) {
			console.warn('Level textures not loaded, using default material');
			return;
		}
		
		// AAA-quality triplanar PBR shader with 2 brick wall variations
		const triplanarShader = new ShaderMaterial({
			uniforms: {
				// Floor textures (metal plates) - 5 textures
				floorColorMap: { value: floorColor },
				floorNormalMap: { value: floorNormal },
				floorRoughnessMap: { value: floorRoughness },
				floorAOMap: { value: floorAO },
				floorMetallicMap: { value: floorMetallic },
				// Wall texture variations - 6 textures (2 brick variations x 3 maps each)
				wallColorMap1: { value: wallColors[0] },
				wallNormalMap1: { value: wallNormals[0] },
				wallRoughnessMap1: { value: wallRoughnesses[0] },
				wallAOMap1: { value: wallAOs[0] },
				wallColorMap2: { value: wallColors[1] },
				wallNormalMap2: { value: wallNormals[1] },
				wallRoughnessMap2: { value: wallRoughnesses[1] },
				wallAOMap2: { value: wallAOs[1] },
				// Lighting - stylized arena style
				lightDir: { value: new Vector3(0.3, 0.9, 0.3).normalize() },
				lightColor: { value: new Color(1.2, 1.15, 1.1) },
				ambientColor: { value: new Color(0.25, 0.28, 0.32) },  // Brighter for stylized look
				// Texture scale
				floorScale: { value: 0.15 },
				wallScale: { value: 0.08 },  // Very subtle texture detail
				// Wall variation parameters
				variationScale: { value: 0.02 }
			},
			vertexShader: `
				varying vec3 vWorldPosition;
				varying vec3 vWorldNormal;
				varying vec3 vViewDir;
				
				void main() {
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vWorldPosition = worldPos.xyz;
					vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
					vViewDir = normalize(cameraPosition - worldPos.xyz);
					gl_Position = projectionMatrix * viewMatrix * worldPos;
				}
			`,
			fragmentShader: `
				uniform sampler2D floorColorMap;
				uniform sampler2D floorNormalMap;
				uniform sampler2D floorRoughnessMap;
				uniform sampler2D floorAOMap;
				uniform sampler2D floorMetallicMap;
				
				uniform sampler2D wallColorMap1;
				uniform sampler2D wallNormalMap1;
				uniform sampler2D wallRoughnessMap1;
				uniform sampler2D wallAOMap1;
				uniform sampler2D wallColorMap2;
				uniform sampler2D wallNormalMap2;
				uniform sampler2D wallRoughnessMap2;
				uniform sampler2D wallAOMap2;
				
				uniform vec3 lightDir;
				uniform vec3 lightColor;
				uniform vec3 ambientColor;
				uniform float floorScale;
				uniform float wallScale;
				uniform float variationScale;
				
				varying vec3 vWorldPosition;
				varying vec3 vWorldNormal;
				varying vec3 vViewDir;
				
				const float PI = 3.14159265359;
				
				// Pseudo-random hash for variation selection
				float hash(vec2 p) {
					return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
				}
				
				// Smooth noise for blending
				float noise(vec2 p) {
					vec2 i = floor(p);
					vec2 f = fract(p);
					f = f * f * (3.0 - 2.0 * f);
					float a = hash(i);
					float b = hash(i + vec2(1.0, 0.0));
					float c = hash(i + vec2(0.0, 1.0));
					float d = hash(i + vec2(1.0, 1.0));
					return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
				}
				
				// Triplanar blend with sharp transitions
				vec3 getTriplanarBlend(vec3 normal) {
					vec3 blend = abs(normal);
					blend = pow(blend, vec3(4.0));
					blend = blend / (blend.x + blend.y + blend.z + 0.0001);
					return blend;
				}
				
				// Sample texture with triplanar projection
				vec4 triplanarSample(sampler2D tex, vec3 pos, vec3 blend, float scale) {
					vec4 xProj = texture2D(tex, pos.zy * scale);
					vec4 yProj = texture2D(tex, pos.xz * scale);
					vec4 zProj = texture2D(tex, pos.xy * scale);
					return xProj * blend.x + yProj * blend.y + zProj * blend.z;
				}
				
				// Triplanar normal mapping
				vec3 triplanarNormal(sampler2D normalMap, vec3 pos, vec3 normal, vec3 blend, float scale) {
					vec3 tnormalX = texture2D(normalMap, pos.zy * scale).rgb * 2.0 - 1.0;
					vec3 tnormalY = texture2D(normalMap, pos.xz * scale).rgb * 2.0 - 1.0;
					vec3 tnormalZ = texture2D(normalMap, pos.xy * scale).rgb * 2.0 - 1.0;
					
					vec3 normalX = vec3(tnormalX.xy + normal.zy, abs(tnormalX.z) * normal.x);
					vec3 normalY = vec3(tnormalY.xy + normal.xz, abs(tnormalY.z) * normal.y);
					vec3 normalZ = vec3(tnormalZ.xy + normal.xy, abs(tnormalZ.z) * normal.z);
					
					return normalize(normalX.zyx * blend.x + normalY.xzy * blend.y + normalZ.xyz * blend.z);
				}
				
				// GGX Distribution
				float distributionGGX(float NdotH, float roughness) {
					float a = roughness * roughness;
					float a2 = a * a;
					float NdotH2 = NdotH * NdotH;
					float denom = NdotH2 * (a2 - 1.0) + 1.0;
					return a2 / (PI * denom * denom);
				}
				
				// Geometry function
				float geometrySchlickGGX(float NdotV, float roughness) {
					float r = roughness + 1.0;
					float k = (r * r) / 8.0;
					return NdotV / (NdotV * (1.0 - k) + k);
				}
				
				float geometrySmith(float NdotV, float NdotL, float roughness) {
					return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
				}
				
				// Fresnel
				vec3 fresnelSchlick(float cosTheta, vec3 F0) {
					return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
				}
				
				void main() {
					vec3 normal = normalize(vWorldNormal);
					vec3 viewDir = normalize(vViewDir);
					vec3 pos = vWorldPosition;
					vec3 blend = getTriplanarBlend(normal);
					
					// Determine surface type
					float isFloor = smoothstep(0.7, 0.9, normal.y);
					float isCeiling = smoothstep(0.7, 0.9, -normal.y);
					float isWall = 1.0 - isFloor - isCeiling;
					isWall = max(isWall, 0.0);
					
					// STYLIZED FLOOR - arena style with grid pattern
					vec3 floorTexture = triplanarSample(floorColorMap, pos, blend, floorScale).rgb;
					vec3 floorNormalTex = triplanarNormal(floorNormalMap, pos, normal, blend, floorScale);
					
					// Grid pattern for visual interest and orientation
					vec2 floorGrid = abs(fract(pos.xz * 0.5) - 0.5);
					float gridLine = min(floorGrid.x, floorGrid.y);
					float grid = smoothstep(0.015, 0.035, gridLine);
					
					// Base floor color - neutral warm tone
					vec3 floorBaseColor = vec3(0.48, 0.46, 0.44);
					vec3 floorAlbedo = mix(floorBaseColor * 0.55, floorBaseColor, grid);
					
					// Add subtle diagonal wear pattern
					float wearPattern = noise(pos.xz * 0.1 + vec2(pos.x - pos.z) * 0.05);
					floorAlbedo = mix(floorAlbedo, floorAlbedo * 0.92, wearPattern * 0.15);
					floorAlbedo = mix(floorAlbedo, floorAlbedo * floorTexture, 0.25);
					
					float floorRough = 0.7;
					float floorAo = 1.0;
					float floorMetal = 0.0;
					vec3 floorN = normalize(mix(normal, floorNormalTex, 0.3));
					
					// STYLIZED ARENA WALLS - designed for 10-15m height
					
					// Base color with vertical gradient for height perception
					float heightGradient = smoothstep(-5.0, 10.0, pos.y);
					vec3 wallBaseColor = mix(vec3(0.50, 0.53, 0.58), vec3(0.62, 0.66, 0.72), heightGradient);
					
					// Add horizontal panels/stripes to emphasize scale
					float panelPattern = fract(pos.y * 0.15);
					float panelLine = smoothstep(0.92, 0.98, panelPattern);
					vec3 panelColor = mix(wallBaseColor, wallBaseColor * 0.75, panelLine);
					
					// Vertical accent lines for visual interest
					vec2 wallCoord = vec2(pos.x + pos.z, pos.y);
					float vertLine = abs(fract(wallCoord.x * 0.08) - 0.5);
					float vertAccent = smoothstep(0.48, 0.5, vertLine);
					panelColor = mix(panelColor * 0.88, panelColor, vertAccent);
					
					// Subtle color tint variation for visual interest
					float colorVar = noise(pos.xz * 0.03);
					panelColor = mix(panelColor, panelColor * vec3(0.98, 1.0, 1.02), colorVar * 0.1);
					
					// Subtle texture detail
					vec3 textureDetail = triplanarSample(wallColorMap1, pos, blend, wallScale).rgb;
					vec3 wallAlbedo = mix(panelColor, panelColor * textureDetail, 0.1);
					
					// Simplified normal
					vec3 wallN = normal;
					vec3 textureN = triplanarNormal(wallNormalMap1, pos, normal, blend, wallScale);
					wallN = normalize(mix(wallN, textureN, 0.15));
					
					float wallRough = 0.6;
					float wallAO = 1.0;
					
					// Ceiling uses floor texture darkened
					vec3 ceilingAlbedo = floorAlbedo * 0.6;
					vec3 ceilingN = floorN;
					float ceilingRough = floorRough;
					
					// Combine materials based on surface type
					vec3 albedo = wallAlbedo * isWall + floorAlbedo * isFloor + ceilingAlbedo * isCeiling;
					float roughness = wallRough * isWall + floorRough * isFloor + ceilingRough * isCeiling;
					float ao = wallAO * isWall + floorAo * isFloor + floorAo * isCeiling;
					float metallic = 0.0 * isWall + floorMetal * isFloor + floorMetal * 0.8 * isCeiling;
					vec3 N = normalize(wallN * isWall + floorN * isFloor + ceilingN * isCeiling);
					
					// Clamp roughness
					roughness = clamp(roughness, 0.05, 1.0);
					
					// PBR calculations
					vec3 V = viewDir;
					vec3 L = normalize(lightDir);
					vec3 H = normalize(V + L);
					
					float NdotL = max(dot(N, L), 0.0);
					float NdotV = max(dot(N, V), 0.001);
					float NdotH = max(dot(N, H), 0.0);
					float HdotV = max(dot(H, V), 0.0);
					
					vec3 F0 = vec3(0.04);
					F0 = mix(F0, albedo, metallic);
					
					float D = distributionGGX(NdotH, roughness);
					float G = geometrySmith(NdotV, NdotL, roughness);
					vec3 F = fresnelSchlick(HdotV, F0);
					
					vec3 kS = F;
					vec3 kD = (1.0 - kS) * (1.0 - metallic);
					
					vec3 specular = (D * G * F) / (4.0 * NdotV * NdotL + 0.0001);
					vec3 diffuse = kD * albedo / PI;
					
					// Direct lighting - balanced for competitive visibility
					vec3 Lo = (diffuse + specular) * lightColor * NdotL * 2.8;
					
					// Ambient with hemisphere - good contrast without being too dark
					float hemi = N.y * 0.5 + 0.5;
					vec3 ambientLo = albedo * mix(ambientColor * 0.5, ambientColor * 1.4, hemi) * ao;
					
					// Fill light - slightly warmer to complement cool walls
					vec3 fillDir = normalize(vec3(-0.3, -0.5, -0.4));
					float fillNdotL = max(dot(N, -fillDir), 0.0);
					vec3 fillLight = albedo * vec3(0.12, 0.13, 0.16) * fillNdotL * 0.7;
					
					// Rim light for geometry definition
					float rimAmount = pow(1.0 - NdotV, 2.5);
					vec3 rimLight = vec3(0.25, 0.28, 0.32) * rimAmount * 0.25;
					
					vec3 finalColor = Lo + ambientLo + fillLight + rimLight;
					
					// Atmospheric fog matching overcast sky
					float dist = length(pos - cameraPosition);
					float fog = 1.0 - exp(-dist * 0.003);
					vec3 fogColor = vec3(0.42, 0.46, 0.50); // Dark overcast atmosphere
					finalColor = mix(finalColor, fogColor, fog * 0.4);
					
					// ACES tone mapping - optimized for competitive visibility
					finalColor = finalColor * 0.75;
					finalColor = (finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14);
					
					// Gamma
					finalColor = pow(finalColor, vec3(1.0/2.2));
					
					gl_FragColor = vec4(finalColor, 1.0);
				}
			`
		});
		
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.material = triplanarShader;
		oldMaterial.dispose();
	}


	/**
	* Clones a positional audio.
	*
	* @param {PositionalAudio} source - A positional audio.
	* @return {PositionalAudio} A clone of the given audio.
	*/
	cloneAudio(source: PositionalAudio): PositionalAudio {

		const audio = new PositionalAudio(source.listener);
		audio.buffer = source.buffer;

		return audio;

	}

	/**
	* Loads all external animations from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadAnimations() {

		const animationLoader = this.animationLoader;

		// player

		animationLoader.load('./assets/animations/player.json', (clips) => {

			for (const clip of clips) {

				this.animations.set(clip.name, clip);

			}

		});

		// blaster

		animationLoader.load('./assets/animations/blaster.json', (clips) => {

			for (const clip of clips) {

				this.animations.set(clip.name, clip);

			}

		});

		// shotgun

		animationLoader.load('./assets/animations/shotgun.json', (clips) => {

			for (const clip of clips) {

				this.animations.set(clip.name, clip);

			}

		});

		// assault rifle

		animationLoader.load('./assets/animations/assaultRifle.json', (clips) => {

			for (const clip of clips) {

				this.animations.set(clip.name, clip);

			}

		});

		return this;

	}

	/**
	* Loads all audios from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadAudios() {

		const audioLoader = this.audioLoader;
		const audios = this.audios;
		const listener = this.listener;

		const blasterShot = new PositionalAudio(listener);
		blasterShot.matrixAutoUpdate = false;

		const shotgunShot = new PositionalAudio(listener);
		shotgunShot.matrixAutoUpdate = false;

		const assaultRifleShot = new PositionalAudio(listener);
		assaultRifleShot.matrixAutoUpdate = false;

		const reload = new PositionalAudio(listener);
		reload.matrixAutoUpdate = false;

		const shotgunShotReload = new PositionalAudio(listener);
		shotgunShotReload.matrixAutoUpdate = false;

		const step1 = new PositionalAudio(listener);
		step1.matrixAutoUpdate = false;

		const step2 = new PositionalAudio(listener);
		step2.matrixAutoUpdate = false;

		const impact1 = new PositionalAudio(listener);
		impact1.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact1.matrixAutoUpdate = false;

		const impact2 = new PositionalAudio(listener);
		impact2.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact2.matrixAutoUpdate = false;

		const impact3 = new PositionalAudio(listener);
		impact3.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact3.matrixAutoUpdate = false;

		const impact4 = new PositionalAudio(listener);
		impact4.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact4.matrixAutoUpdate = false;

		const impact5 = new PositionalAudio(listener);
		impact5.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact5.matrixAutoUpdate = false;

		const impact6 = new PositionalAudio(listener);
		impact6.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact6.matrixAutoUpdate = false;

		const impact7 = new PositionalAudio(listener);
		impact7.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
		impact7.matrixAutoUpdate = false;

		const health = new PositionalAudio(listener);
		health.matrixAutoUpdate = false;

		const ammo = new PositionalAudio(listener);
		ammo.matrixAutoUpdate = false;

		audioLoader.load('./assets/audio/sfx/weapons/blaster_shot.ogg', buffer => blasterShot.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/weapons/shotgun_shot.ogg', buffer => shotgunShot.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/weapons/assault_rifle_shot.ogg', buffer => assaultRifleShot.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/weapons/reload.ogg', buffer => reload.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/weapons/shotgun_shot_reload.ogg', buffer => shotgunShotReload.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/player/step1.ogg', buffer => step1.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/player/step2.ogg', buffer => step2.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact1.ogg', buffer => impact1.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact2.ogg', buffer => impact2.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact3.ogg', buffer => impact3.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact4.ogg', buffer => impact4.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact5.ogg', buffer => impact5.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact6.ogg', buffer => impact6.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/impacts/impact7.ogg', buffer => impact7.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/ui/health.ogg', buffer => health.setBuffer(buffer));
		audioLoader.load('./assets/audio/sfx/ui/ammo.ogg', buffer => ammo.setBuffer(buffer));

		audios.set('blaster_shot', blasterShot);
		audios.set('shotgun_shot', shotgunShot);
		audios.set('assault_rifle_shot', assaultRifleShot);
		audios.set('reload', reload);
		audios.set('shotgun_shot_reload', shotgunShotReload);
		audios.set('step1', step1);
		audios.set('step2', step2);
		audios.set('impact1', impact1);
		audios.set('impact2', impact2);
		audios.set('impact3', impact3);
		audios.set('impact4', impact4);
		audios.set('impact5', impact5);
		audios.set('impact6', impact6);
		audios.set('impact7', impact7);
		audios.set('health', health);
		audios.set('ammo', ammo);

		return this;

	}

	/**
	* Loads all configurations from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadConfigs() {

		const loadingManager = this.loadingManager;
		const configs = this.configs;

		// level config

		loadingManager.itemStart('levelConfig');

		fetch('./assets/data/config/level.json')
			.then(response => {

				return response.json();

			})
			.then(json => {

				configs.set('level', json);

				loadingManager.itemEnd('levelConfig');

			});

		return this;

	}

	/**
	* Loads all models from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadModels() {

		const gltfLoader = this.gltfLoader;
		const textureLoader = this.textureLoader;
		const models = this.models;
		const animations = this.animations;

		// shadow for soldiers

		const shadowTexture = textureLoader.load('./assets/textures/environment/shadow.png');
		const planeGeometry = new PlaneGeometry();
		const planeMaterial = new MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.4 });

		const shadowPlane = new Mesh(planeGeometry, planeMaterial);
		shadowPlane.position.set(0, 0.05, 0);
		shadowPlane.rotation.set(- Math.PI * 0.5, 0, 0);
		shadowPlane.scale.multiplyScalar(2);
		shadowPlane.matrixAutoUpdate = false;
		shadowPlane.updateMatrix();

		// soldier

		gltfLoader.load('./assets/models/characters/soldier.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.animations = gltf.animations;

			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				if (object instanceof Mesh) {

					object.material.side = DoubleSide;
					object.matrixAutoUpdate = false;
					object.updateMatrix();

				}

			});

			renderComponent.add(shadowPlane);

			models.set('soldier', renderComponent);

			for (let animation of gltf.animations) {

				animations.set(animation.name, animation);

			}

		});

		// level

		gltfLoader.load('./assets/models/environment/level.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('level', renderComponent);

		});

	// blaster, high poly

	gltfLoader.load('./assets/models/weapons/blaster_high.glb', (gltf) => {

		const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('blaster_high', renderComponent);

		});

		// blaster, low poly

		gltfLoader.load('./assets/models/weapons/blaster_low.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('blaster_low', renderComponent);

		});

		// shotgun, high poly

		gltfLoader.load('./assets/models/weapons/shotgun_high.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('shotgun_high', renderComponent);

		});

		// shotgun, low poly

		gltfLoader.load('./assets/models/weapons/shotgun_low.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('shotgun_low', renderComponent);

		});

		// assault rifle, high poly

		gltfLoader.load('./assets/models/weapons/assaultRifle_high.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('assaultRifle_high', renderComponent);

		});

		// assault rifle, low poly

		gltfLoader.load('./assets/models/weapons/assaultRifle_low.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('assaultRifle_low', renderComponent);

		});

		// health pack

		gltfLoader.load('./assets/models/props/healthPack.glb', (gltf) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse((object) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			});

			models.set('healthPack', renderComponent);

		});

		// muzzle sprite

		const muzzleTexture = textureLoader.load('./assets/textures/effects/muzzle.png');
		muzzleTexture.matrixAutoUpdate = false;

		const muzzleMaterial = new SpriteMaterial({ map: muzzleTexture });
		const muzzle = new Sprite(muzzleMaterial);
		muzzle.matrixAutoUpdate = false;
		muzzle.visible = false;

		models.set('muzzle', muzzle);

		// bullet line

		const bulletLineGeometry = new BufferGeometry();
		const bulletLineMaterial = new LineBasicMaterial({ color: 0xfbf8e6 });

		bulletLineGeometry.setFromPoints([new Vector3(), new Vector3(0, 0, - 1)]);

		const bulletLine = new LineSegments(bulletLineGeometry, bulletLineMaterial);
		bulletLine.matrixAutoUpdate = false;

		models.set('bulletLine', bulletLine);

	}

	/**
	* Loads all textures from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadTextures() {

		const textureLoader = this.textureLoader;

		// === LEVEL TEXTURES ===
		// Concrete floor - matching style with walls
		const floorPath = './assets/textures/level/Concrete043B_1K-JPG/Concrete043B_1K-JPG';
		const floorColor = textureLoader.load(`${floorPath}_Color.jpg`);
		floorColor.wrapS = floorColor.wrapT = RepeatWrapping;
		floorColor.colorSpace = SRGBColorSpace;
		this.textures.set('floor_color', floorColor);

		const floorNormal = textureLoader.load(`${floorPath}_NormalGL.jpg`);
		floorNormal.wrapS = floorNormal.wrapT = RepeatWrapping;
		this.textures.set('floor_normal', floorNormal);

		const floorRoughness = textureLoader.load(`${floorPath}_Roughness.jpg`);
		floorRoughness.wrapS = floorRoughness.wrapT = RepeatWrapping;
		this.textures.set('floor_roughness', floorRoughness);

		const floorAO = textureLoader.load(`${floorPath}_AmbientOcclusion.jpg`);
		floorAO.wrapS = floorAO.wrapT = RepeatWrapping;
		this.textures.set('floor_ao', floorAO);

		const floorMetallic = textureLoader.load(`${floorPath}_Metalness.jpg`);
		floorMetallic.wrapS = floorMetallic.wrapT = RepeatWrapping;
		this.textures.set('floor_metallic', floorMetallic);

		// Clean concrete walls - minimal FPS aesthetic
		const concretePath = './assets/textures/level/Concrete042A_1K-JPG/Concrete042A_1K-JPG';
		
		const wallColor1 = textureLoader.load(`${concretePath}_Color.jpg`);
		wallColor1.wrapS = wallColor1.wrapT = RepeatWrapping;
		wallColor1.colorSpace = SRGBColorSpace;
		this.textures.set('wall_color_1', wallColor1);
		this.textures.set('wall_color_2', wallColor1); // Same texture for both variations

		const wallNormal1 = textureLoader.load(`${concretePath}_NormalGL.jpg`);
		wallNormal1.wrapS = wallNormal1.wrapT = RepeatWrapping;
		this.textures.set('wall_normal_1', wallNormal1);
		this.textures.set('wall_normal_2', wallNormal1);

		// Concrete uses metalness as roughness approximation
		const wallRoughness1 = textureLoader.load(`${concretePath}_Metalness.jpg`);
		wallRoughness1.wrapS = wallRoughness1.wrapT = RepeatWrapping;
		this.textures.set('wall_roughness_1', wallRoughness1);
		this.textures.set('wall_roughness_2', wallRoughness1);

		const wallAO1 = textureLoader.load(`${concretePath}_AmbientOcclusion.jpg`);
		wallAO1.wrapS = wallAO1.wrapT = RepeatWrapping;
		this.textures.set('wall_ao_1', wallAO1);
		this.textures.set('wall_ao_2', wallAO1);

		// UI textures
		let texture = textureLoader.load('./assets/textures/ui/crosshairs.png');
		texture.matrixAutoUpdate = false;
		this.textures.set('crosshairs', texture);

		texture = textureLoader.load('./assets/textures/ui/damageIndicatorFront.png');
		texture.matrixAutoUpdate = false;
		this.textures.set('damageIndicatorFront', texture);

		texture = textureLoader.load('./assets/textures/ui/damageIndicatorRight.png');
		texture.matrixAutoUpdate = false;
		this.textures.set('damageIndicatorRight', texture);

		texture = textureLoader.load('./assets/textures/ui/damageIndicatorLeft.png');
		texture.matrixAutoUpdate = false;
		this.textures.set('damageIndicatorLeft', texture);

		texture = textureLoader.load('./assets/textures/ui/damageIndicatorBack.png');
		texture.matrixAutoUpdate = false;
		this.textures.set('damageIndicatorBack', texture);

		return this;

	}

	/**
	* Loads the navigation mesh from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadNavMesh() {

		const navMeshLoader = this.navMeshLoader;
		const loadingManager = this.loadingManager;

		loadingManager.itemStart('navmesh');

		navMeshLoader.load('./assets/data/navmeshes/navmesh.glb').then((navMesh) => {

			this.navMesh = navMesh;

			loadingManager.itemEnd('navmesh');

		});

		//

		loadingManager.itemStart('costTable');

		fetch('./assets/data/navmeshes/costTable.json')
			.then(response => {

				return response.json();

			})
			.then(json => {

				this.costTable = new CostTable().fromJSON(json);

				loadingManager.itemEnd('costTable');

			});

		return this;

	}

}

export { AssetManager };
