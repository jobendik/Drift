import * as THREE from 'three';
import { Player } from './entities/Player';
import { EnemyManager, Enemy } from './entities/EnemyManager';
import { WeaponSystem } from './systems/WeaponSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { PickupSystem } from './systems/PickupSystem';
import { ImpactSystem } from './systems/ImpactSystem';
import { DecalSystem } from './systems/DecalSystem';
import { BulletTracerSystem } from './systems/BulletTracerSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { Arena } from './world/Arena';
import { InputManager, GameAction } from './core/InputManager';
import { PostProcessing } from './core/PostProcessing';
import { HUDManager } from './ui/HUDManager';
import { KillfeedManager } from './ui/KillfeedManager';
import { DamageTextSystem } from './ui/DamageTextSystem';
import { StartScreen } from './ui/StartScreen';
import { MobileControls } from './ui/MobileControls';
import { ExplosionSystem } from './systems/ExplosionSystem';
import { GameState } from './types';
import { PLAYER_CONFIG, CAMERA_CONFIG, WEAPON_CONFIG, LOBBY_URL } from './config/gameConfig';
import { DamageType } from './core/DamageTypes';
import { BackendConnector } from './managers/BackendConnector';
import { NetworkManager } from './managers/NetworkManager';
import { SettingsManager } from './managers/SettingsManager';
import { GameModeManager, GameModeType } from './managers/GameModeManager';
import { DEFAULT_MAP, BATTLE_ROYALE_MAP } from './config/maps';
import { ZoneSystem } from './systems/ZoneSystem';
import { AIManager } from './ai/core/AIManager';

// ... (existing imports)

export class Game {
  // ... (existing properties)

  public settingsManager: SettingsManager;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;



  // ...



  private renderer: THREE.WebGLRenderer;
  private postProcessing: PostProcessing;

  public player: Player;
  public weaponSystem: WeaponSystem;
  public enemyManager: EnemyManager;
  public particleSystem: ParticleSystem;
  public pickupSystem: PickupSystem;
  public impactSystem: ImpactSystem;
  public decalSystem: DecalSystem;
  public bulletTracerSystem: BulletTracerSystem;
  public projectileSystem: ProjectileSystem;
  public explosionSystem: ExplosionSystem;
  public zoneSystem: ZoneSystem;
  public damageTextSystem: DamageTextSystem;
  public arena: Arena;
  public inputManager: InputManager;
  public hudManager: HUDManager;
  public killfeedManager: KillfeedManager;
  public startScreen?: StartScreen;
  public mobileControls?: MobileControls;

  public isMobile: boolean;
  public backendConnector: BackendConnector;
  public networkManager: NetworkManager;
  public gameModeManager: GameModeManager;
  public aiManager: AIManager;

  public gameState: GameState;
  private lastTime = 0;
  private gameTime = 0;
  private pointLights: { light: THREE.PointLight; baseIntensity: number; phase: number }[] = [];
  private skyMaterial?: THREE.ShaderMaterial;

  // Hit Feedback
  private multiKillCount = 0;
  private lastKillTime = 0;
  private hitStreakCount = 0;

  private respawnSound?: THREE.Audio;
  private musicTrack?: THREE.Audio;
  private musicPlaying = false;

  // Spectator Mode
  public isSpectating = false;
  private spectatorTargetId: string | null = null;
  private isDeadSequenceActive: boolean = false;

  // Intro sequence
  private introActive = false;
  private introFallSpeed = 0;
  private introStartHeight = 400; // MUCH higher start!
  private introTargetHeight = 1.6; // Player eye level

  constructor() {
    console.log('Initializing game...');

    this.settingsManager = new SettingsManager();

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.baseFOV,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Audio Listener
    const listener = new THREE.AudioListener();
    this.camera.add(listener);

    // Load Respawn Sound
    const audioLoader = new THREE.AudioLoader();
    this.respawnSound = new THREE.Audio(listener);
    audioLoader.load('assets/audio/level/Respawn-Sound.mp3_d53a31ce.mp3', (buffer) => {
      this.respawnSound?.setBuffer(buffer);
      this.respawnSound?.setVolume(0.5);
    });

    // Load Music Track
    this.musicTrack = new THREE.Audio(listener);
    audioLoader.load('assets/music/psytrance.mp3', (buffer) => {
      this.musicTrack?.setBuffer(buffer);
      this.musicTrack?.setLoop(true);
      this.musicTrack?.setVolume(0.3);
    });

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    (this.renderer as any).outputEncoding = THREE.sRGBEncoding;

    const container = document.getElementById('game-container');
    if (!container) {
      console.error('Game container not found!');
      throw new Error('Game container element not found');
    }

    // Initialize start screen
    this.startScreen = new StartScreen(container, () => this.startGame());
    console.log('Start screen initialized');

    // Initialize game systems
    this.player = new Player(listener);
    this.particleSystem = new ParticleSystem(this.scene);
    this.weaponSystem = new WeaponSystem(this.camera, listener, this.particleSystem);
    this.arena = new Arena(this.scene, DEFAULT_MAP);
    this.enemyManager = new EnemyManager(this.scene, listener);
    this.pickupSystem = new PickupSystem(this.scene, listener, this.arena);
    this.impactSystem = new ImpactSystem(this.scene, listener);

    // Setup shell ejection
    this.weaponSystem.setShellEjectCallback((pos, dir) => {
      this.particleSystem.spawnShellCasing(pos, dir, (hitPos) => {
        this.impactSystem.playShellDrop(hitPos);
      });
    });

    this.decalSystem = new DecalSystem(this.scene);
    this.bulletTracerSystem = new BulletTracerSystem(this.scene, this.camera);
    this.projectileSystem = new ProjectileSystem(this.scene, this.particleSystem);
    this.damageTextSystem = new DamageTextSystem(this.camera);
    this.explosionSystem = new ExplosionSystem(
      this.particleSystem,
      this.enemyManager,
      this.player,
      this.weaponSystem,
      this.impactSystem
    );
    this.zoneSystem = new ZoneSystem(this.scene);

    this.hudManager = new HUDManager();
    this.killfeedManager = new KillfeedManager();
    this.inputManager = new InputManager(CAMERA_CONFIG.mouseSensitivity);
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    this.backendConnector = new BackendConnector();
    // Loadout fetch deferred to startGame

    // Initialize mobile controls if on mobile device
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
      this.mobileControls = new MobileControls();
    }

    this.setupScene();
    this.setupEventListeners();

    this.networkManager = new NetworkManager(this);
    this.gameModeManager = new GameModeManager(this);
    this.aiManager = new AIManager(this.scene);

    this.gameState = {
      running: false,
      paused: false,
      wave: 1,
      score: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeStarted: 0,
      waveInProgress: false,
      betweenWaves: false,
      inStartScreen: true,
    };

    console.log('Game initialized successfully');
    this.applySettings();
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  private setupScene(): void {
    // Lighting
    this.scene.add(new THREE.AmbientLight(0x1a1a3a, 0.3));

    const mainLight = new THREE.DirectionalLight(0xff6b35, 1.2);
    mainLight.position.set(30, 50, -30);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 150;
    mainLight.shadow.camera.left = -60;
    mainLight.shadow.camera.right = 60;
    mainLight.shadow.camera.top = 60;
    mainLight.shadow.camera.bottom = -60;
    this.scene.add(mainLight);

    const dir2 = new THREE.DirectionalLight(0x4a9eff, 0.4);
    dir2.position.set(-30, 20, 30);
    this.scene.add(dir2);

    const dir3 = new THREE.DirectionalLight(0xff4488, 0.6);
    dir3.position.set(0, 10, 50);
    this.scene.add(dir3);

    // Animated point lights
    const centerLight = new THREE.PointLight(0xff3366, 2, 25);
    centerLight.position.set(0, 3, 0);
    this.scene.add(centerLight);
    this.pointLights.push({ light: centerLight, baseIntensity: 2, phase: 0 });

    const cornerColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88];
    const cornerPositions = [[20, 4, 20], [-20, 4, 20], [20, 4, -20], [-20, 4, -20]];
    cornerPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(cornerColors[i], 1.5, 30);
      light.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(light);
      this.pointLights.push({ light, baseIntensity: 1.5, phase: i * 0.5 });
    });

    // Sky
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        topColor: { value: new THREE.Color(0x0a0a1a) },
        bottomColor: { value: new THREE.Color(0x1a0a2e) },
        sunColor: { value: new THREE.Color(0xff4400) },
        sunPosition: { value: new THREE.Vector3(100, 20, -100) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunPosition;
        varying vec3 vWorldPosition;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
          float heightFactor = (viewDirection.y + 1.0) * 0.5;
          vec3 skyColor = mix(bottomColor, topColor, pow(heightFactor, 0.5));
          
          vec3 sunDir = normalize(sunPosition);
          float sunDot = max(0.0, dot(viewDirection, sunDir));
          skyColor += sunColor * (pow(sunDot, 64.0) * 2.0 + pow(sunDot, 8.0) * 0.3);
          
          float aurora = sin(viewDirection.x * 3.0 + time * 0.5) * 
                         sin(viewDirection.z * 2.0 + time * 0.3) * 0.5 + 0.5;
          skyColor += vec3(0.2, 0.5, 1.0) * aurora * pow(heightFactor, 2.0) * 0.15;
          
          vec2 starUV = viewDirection.xz / (viewDirection.y + 0.1);
          float stars = step(0.998, random(floor(starUV * 200.0))) * heightFactor * 0.8;
          float twinkle = sin(time * 3.0 + random(floor(starUV * 200.0)) * 100.0) * 0.5 + 0.5;
          skyColor += vec3(1.0) * stars * twinkle;
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    this.skyMaterial = skyMat;
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Reduce fog density so level is visible from high up during intro
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.003);
    this.scene.add(this.camera);
  }

  private applySettings(): void {
    const settings = this.settingsManager.getSettings();

    // Apply Sensitivity
    if (this.inputManager) {
      this.inputManager.setSensitivity(settings.sensitivity);
    }

    // Apply Volume
    if (this.musicTrack) this.musicTrack.setVolume(settings.volume * 0.3);
    if (this.respawnSound) this.respawnSound.setVolume(settings.volume * 0.5);

    if (this.camera) {
      const listener = this.camera.children.find(c => c instanceof THREE.AudioListener) as THREE.AudioListener;
      if (listener) {
        listener.setMasterVolume(settings.volume);
      }
    }

    // Apply FOV
    if (this.camera && !this.introActive && (!this.weaponSystem || !this.weaponSystem.isZoomed)) {
      this.camera.fov = settings.fov;
      this.camera.updateProjectionMatrix();
      CAMERA_CONFIG.baseFOV = settings.fov;
    }
  }

  private setupEventListeners(): void {
    this.inputManager.setJumpCallback(() => {
      this.player.jumpBufferTimer = PLAYER_CONFIG.jumpBuffer;
    });

    this.inputManager.setReloadCallback(() => {
      this.tryReload();
    });

    this.inputManager.setPauseCallback(() => {
      this.togglePause();
    });

    this.inputManager.setNextWeaponCallback(() => {
      this.weaponSystem.scrollWeapon(1);
      this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
    });

    this.inputManager.setPrevWeaponCallback(() => {
      this.weaponSystem.scrollWeapon(-1);
      this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
    });

    this.inputManager.setWeaponSelectCallback((index) => {
      this.weaponSystem.switchWeapon(index);
      this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
    });

    this.inputManager.setLastWeaponCallback(() => {
      this.weaponSystem.toggleLastWeapon();
      this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
    });

    this.inputManager.setZoomCallback((isZoomed) => {
      const changed = this.weaponSystem.setZoom(isZoomed);
      if (changed) {
        this.hudManager.toggleScope(isZoomed);
        // Instant FOV change for responsiveness
        if (isZoomed) {
          this.player.currentFOV = 40; // Zoomed FOV
        } else {
          this.player.currentFOV = CAMERA_CONFIG.baseFOV;
        }
      }
    });

    window.addEventListener('resize', () => this.onWindowResize());

    // M key to toggle music
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'm') {
        this.toggleMusic();
      }
    });

    document.addEventListener('click', () => {
      if (!this.gameState.running && !this.gameState.paused && !this.gameState.inStartScreen) {
        this.startGame();
      } else if (this.gameState.paused) {
        this.togglePause();
      } else if (this.gameState.running) {
        this.tryRequestPointerLock();
      }
    });

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        location.reload();
      });
    }

    const lobbyBtn = document.getElementById('lobby-btn');
    if (lobbyBtn) {
      lobbyBtn.addEventListener('click', () => {
        this.returnToLobby();
      });
    }

    this.hudManager.setupSettingsMenu(
      this.settingsManager,
      () => { // On Back
        this.applySettings();
        this.tryRequestPointerLock();
      },
      () => { // On Change
        this.applySettings();
      }
    );
  }

  private returnToLobby(): void {
    console.log('Returning to lobby...');
    window.location.href = LOBBY_URL;
  }

  private tryRequestPointerLock(): void {
    if (this.isMobile) {
      console.log('Pointer lock disabled on mobile.');
      return;
    }

    try {
      const el: any = this.renderer && (this.renderer as any).domElement;
      const request = el && (el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock);
      if (request) {
        request.call(el);
        return;
      }

      const docReq = (document as any).body && ((document as any).body.requestPointerLock || (document as any).body.mozRequestPointerLock || (document as any).body.webkitRequestPointerLock);
      if (docReq) {
        docReq.call((document as any).body);
        return;
      }

      console.warn('Pointer lock API not available in this environment.');
    } catch (err) {
      console.warn('Failed to request pointer lock:', err);
    }
  }

  public tryExitPointerLock(): void {
    if (this.isMobile) {
      // Nothing to do on mobile
      return;
    }

    try {
      const exit = (document as any).exitPointerLock || (document as any).mozExitPointerLock || (document as any).webkitExitPointerLock;
      if (exit) {
        exit.call(document);
        return;
      }
      console.warn('Pointer lock exit not available in this environment.');
    } catch (err) {
      console.warn('Failed to exit pointer lock:', err);
    }
  }

  public startGame(): void {
    // Determine game mode from URL
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode') || 'arena-classic';
    const token = urlParams.get('token');
    const matchId = urlParams.get('matchId') || undefined;

    // Map Selection based on Mode
    if (modeParam === 'battle-royale' || modeParam === 'br') {
      console.log('Loading Battle Royale Map...');
      // Re-initialize Arena with BR Map
      // Note: Ideally we should have a method to switch maps without recreating everything, 
      // but for now this is the cleanest way given the current architecture.
      // We need to clear old arena objects first if any exist (though this is start of game)
      this.arena = new Arena(this.scene, BATTLE_ROYALE_MAP);
      this.pickupSystem.setArena(this.arena); // Update reference
    }

    // Connect to backend if token is present (Social/Multiplayer context)
    if (token) {
      console.log('Token found, connecting to backend...');
      this.backendConnector.setToken(token);
      this.backendConnector.getLoadout().then((loadout: any) => {
        if (loadout && loadout.equipped) {
          console.log('Loadout received:', loadout);
          this.weaponSystem.setLoadout(loadout.equipped.primary, loadout.equipped.secondary);
        }
      });

      this.networkManager.connect(token, matchId);
    }

    let modeType = GameModeType.SINGLE_PLAYER_WAVE;

    // Map RiftSocial IDs to GameModeTypes
    switch (modeParam) {
      // Single Player Modes
      case 'arena-classic':
      case 'arena-waves':
      case 'arena-time':
      case 'arena-rotating':
      case 'arena-chaos':
      case 'arena-gauntlet':
      case 'arena-weapon':
      case 'arena-combo':
      case 'arena-precision':
      case 'target':
      case 'time-trial':
      case 'score-attack':
        modeType = GameModeType.SINGLE_PLAYER_WAVE;
        break;

      // Multiplayer Modes
      case 'tdm':
        modeType = GameModeType.TEAM_DEATHMATCH;
        break;

      case 'ffa':
      case 'duel':
      case 'ctf':
        modeType = GameModeType.CAPTURE_THE_FLAG;
        break;

      case 'br':
      case 'battle-royale':
        modeType = GameModeType.BATTLE_ROYALE;
        break;

      case 'ffa':
      case 'horde':
      case 'koth':
      case 'elimination':
      case 'domination':
      case 'hardpoint':
      case 'gun-game':
      case 'infection':
      case 'juggernaut':
      case 'assassin':
      case 'payload':
      case 'extraction':
      case 'demolition':
      case 'heist':
      case 'one-chamber':
      case 'instagib':
      case 'dodgeball':
      case 'boss-rush':
        modeType = GameModeType.MULTIPLAYER_DEATHMATCH;
        break;

      default:
        console.warn(`Unknown mode '${modeParam}', defaulting to Single Player Wave`);
        modeType = GameModeType.SINGLE_PLAYER_WAVE;
    }

    console.log(`Starting game in mode: ${modeType} (requested: ${modeParam})`);
    // Stop start screen
    if (this.startScreen) {
      this.startScreen.stop();
      this.startScreen = undefined;
    }

    // Request fullscreen
    try {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
      });
    } catch (err) {
      console.log('Fullscreen not supported:', err);
    }

    // Add game renderer to container
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    this.hudManager.hideStartScreen();
    this.hudManager.hideGameOver();
    this.hudManager.showHUD();

    // Show mobile controls if on mobile
    if (this.isMobile && this.mobileControls) {
      this.mobileControls.show();
    }

    // Reset game state
    this.gameState = {
      running: true,
      paused: false,
      wave: 1,
      score: 0,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeStarted: performance.now(),
      waveInProgress: false,
      betweenWaves: false,
      inStartScreen: false,
    };

    // Reset systems
    this.player.reset();
    this.weaponSystem.reset();
    this.enemyManager.clear();
    this.particleSystem.clear();
    this.pickupSystem.clear();
    this.hudManager.reset();

    // Spawn initial pickups (but don't show HUD yet)
    // this.pickupSystem.spawnWavePickups(this.player.health, PLAYER_CONFIG.maxHealth, this.gameState.wave);

    // DON'T update HUD yet - wait until after intro lands
    // this.updateHUD();

    // Start dramatic intro sequence
    this.introActive = true;
    this.introFallSpeed = 30; // Start with initial downward velocity!
    this.player.position.y = this.introStartHeight;
    this.camera.position.copy(this.player.position);

    // Look down at the arena (negative pitch to look down)
    this.player.rotation.x = -Math.PI / 3; // Look down at arena
    this.player.rotation.y = 0;

    // Start game animation loop
    this.lastTime = performance.now();
    if (this.respawnSound && this.respawnSound.buffer) {
      this.respawnSound.play();
    }

    // Set game mode
    this.gameModeManager.setMode(modeType);

    this.animate();
  }

  // Wave logic moved to SinglePlayerWaveMode

  /**
   * Get weapon-specific tracer color and texture preference
   * Bright, saturated colors for maximum visibility
   */
  private getTracerProperties(): { color: number; useFireTexture: boolean } {
    const weaponType = this.weaponSystem.currentWeaponType;

    switch (weaponType) {
      case 'AK47':
        return { color: 0xff6600, useFireTexture: true }; // Bright orange fire
      case 'M4':
        return { color: 0x00ffff, useFireTexture: false }; // Bright cyan
      case 'AWP':
      case 'Sniper':
        return { color: 0xff00ff, useFireTexture: true }; // Bright magenta energy
      case 'LMG':
        return { color: 0xffcc00, useFireTexture: true }; // Bright yellow-orange
      case 'Shotgun':
        return { color: 0xff4400, useFireTexture: true }; // Bright red-orange
      case 'Pistol':
        return { color: 0x00ffff, useFireTexture: false }; // Bright cyan
      case 'Tec9':
        return { color: 0x00ffaa, useFireTexture: false }; // Bright green-cyan
      case 'Scar':
        return { color: 0xffaa00, useFireTexture: true }; // Bright orange
      default:
        return { color: 0x00ffff, useFireTexture: false }; // Default bright cyan
    }
  }

  // Wave completion logic moved to SinglePlayerWaveMode

  private tryReload(): void {
    const reloadStarted = this.weaponSystem.tryReload(() => {
      this.hudManager.showReloading(false);
      this.updateHUD();
    });

    if (reloadStarted) {
      this.hudManager.showReloading(true);
    }
  }

  private togglePause(): void {
    this.gameState.paused = !this.gameState.paused;
    this.hudManager.showPauseMenu(this.gameState.paused);

    if (this.gameState.paused) {
      this.tryExitPointerLock();
    } else {
      this.tryRequestPointerLock();
    }
  }

  private toggleMusic(): void {
    if (!this.musicTrack || !this.musicTrack.buffer) return;

    if (this.musicPlaying) {
      this.musicTrack.pause();
      this.musicPlaying = false;
      console.log('Music paused');
    } else {
      this.musicTrack.play();
      this.musicPlaying = true;
      console.log('Music playing');
    }
  }

  // private quitToMenu(): void {
  //   this.gameState.running = false;
  //   this.gameState.paused = false;
  //   document.exitPointerLock();
  //   this.hudManager.showPauseMenu(false);
  //   location.reload();
  // }



  public updateHUD(): void {
    const healthPercent = (this.player.health / PLAYER_CONFIG.maxHealth) * 100;
    this.hudManager.updateHealth(this.player.health, PLAYER_CONFIG.maxHealth);
    this.player.updateHeartbeat(healthPercent);
    this.hudManager.updateArmor(this.player.armor, PLAYER_CONFIG.maxArmor);
    this.hudManager.updateStamina(this.player.stamina, PLAYER_CONFIG.maxStamina);
    this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
    this.hudManager.updateAmmo(this.weaponSystem.currentMag, this.weaponSystem.reserveAmmo);
    this.hudManager.updateWave(this.gameState.wave);
    this.hudManager.updateScore(this.gameState.score);
    this.hudManager.updateEnemiesRemaining(this.enemyManager.getEnemyCount());
  }

  private updateIntroSequence(delta: number): void {
    // EXTREME acceleration - feel the speed increase!
    this.introFallSpeed += 90 * delta; // Faster acceleration!

    // Apply fall
    this.player.position.y -= this.introFallSpeed * delta;

    // Calculate speed factor for all effects
    const speedFactor = Math.min(this.introFallSpeed / 120, 1);
    const distanceToGround = this.player.position.y - this.introTargetHeight;
    const proximityFactor = 1 - Math.max(0, Math.min(1, distanceToGround / 100));

    // EXTREME FOV increase - up to +40 FOV!
    this.camera.fov = CAMERA_CONFIG.baseFOV + (speedFactor * 40);
    this.camera.updateProjectionMatrix();

    // Add chromatic aberration for speed effect
    this.postProcessing.setChromaAmount(speedFactor * 3);

    // Camera roll as we fall (spinning sensation)
    const rollAmount = speedFactor * Math.sin(this.gameTime * 3) * 0.1;

    // Update camera with roll
    this.camera.position.copy(this.player.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.rotation.y;
    this.camera.rotation.x = this.player.rotation.x;
    this.camera.rotation.z = rollAmount;

    // INTENSE speed blur shake effect as we get closer
    if (proximityFactor > 0.3) {
      const shakeIntensity = proximityFactor * 0.05;
      this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;
    }

    // MASSIVE particle trails - multiple colors!
    const particleSpawnChance = 0.5 + (speedFactor * 0.5); // Up to 100% spawn rate!
    if (Math.random() < particleSpawnChance) {
      // Cyan trail
      this.particleSystem.spawn(
        this.player.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3,
          (Math.random() - 0.5) * 4
        )),
        0x00ffff,
        5
      );

      // Orange/red speed lines
      if (speedFactor > 0.5) {
        this.particleSystem.spawn(
          this.player.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 4,
            (Math.random() - 0.5) * 5
          )),
          0xff6600,
          4
        );
      }

      // Magenta energy at high speed
      if (speedFactor > 0.7) {
        this.particleSystem.spawn(
          this.player.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            Math.random() * 5,
            (Math.random() - 0.5) * 6
          )),
          0xff00ff,
          6
        );
      }
    }

    // Check for impact
    if (this.player.position.y <= this.introTargetHeight) {
      // ULTIMATE CRASH LANDING!!!
      this.player.position.y = this.introTargetHeight;
      this.introActive = false;

      // INSANE camera shake!!!
      this.weaponSystem.cameraShake.intensity = 0.8;

      // MASSIVE EXPLOSION - Multiple waves of particles!
      const landPos = this.player.position.clone();

      // Core explosion - orange/red
      this.particleSystem.spawn(landPos, 0xff3300, 100);
      this.particleSystem.spawn(landPos, 0xff6600, 80);

      // Secondary blast - cyan/blue
      this.particleSystem.spawn(landPos, 0x00ffff, 70);
      this.particleSystem.spawn(landPos, 0x0088ff, 60);

      // Energy burst - magenta/purple
      this.particleSystem.spawn(landPos, 0xff00ff, 50);
      this.particleSystem.spawn(landPos, 0xaa00ff, 40);

      // White flash burst
      this.particleSystem.spawn(landPos, 0xffffff, 30);

      // Shockwave ring particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 3;
        const ringPos = landPos.clone().add(new THREE.Vector3(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance
        ));
        this.particleSystem.spawn(ringPos, 0xffff00, 20);
      }

      // Start music at the exact moment of landing!
      if (this.musicTrack && this.musicTrack.buffer && !this.musicPlaying) {
        this.musicTrack.play();
        this.musicPlaying = true;
      }

      // Reset effects
      this.camera.fov = CAMERA_CONFIG.baseFOV;
      this.camera.rotation.z = 0;
      this.camera.updateProjectionMatrix();
      this.postProcessing.setChromaAmount(0);

      // Enable pointer lock and start wave with slight delay for dramatic effect
      this.tryRequestPointerLock();
      // setTimeout(() => this.startWave(), 800); // Handled by GameMode
    }
  }

  public update(delta: number): void {
    // Spectator Mode Logic
    // Spectator Mode Logic
    if (this.isSpectating) {
      const remotePlayers = this.networkManager.getRemotePlayers();
      const enemies = this.enemyManager.getEnemies();
      // Use mesh.uuid as fallback ID for enemies since they don't have a dedicated ID property
      const allTargets = [...remotePlayers.map(p => ({ mesh: p.mesh, id: p.id, name: `Player ${p.id}` })), ...enemies.map(e => ({ mesh: e.mesh, id: e.mesh.uuid, name: 'Enemy' }))];

      if (allTargets.length > 0) {
        // Input for switching targets
        if (this.inputManager.isActionPressed(GameAction.Fire)) { // Left Click
          this.cycleSpectatorTarget(allTargets, 1);
        } else if (this.inputManager.isActionPressed(GameAction.Aim)) { // Right Click
          this.cycleSpectatorTarget(allTargets, -1);
        }

        if (!this.spectatorTargetId) {
          this.spectatorTargetId = allTargets[0].id;
        }

        const target = allTargets.find(t => t.id === this.spectatorTargetId) || allTargets[0];

        if (target) {
          // Update UI if changed
          if (this.hudManager) {
            // We might want to optimize this to not call every frame
            // But for now it ensures the name is correct
            // this.hudManager.showSpectatorUI(target.name); 
          }

          // Third-person follow camera
          // Calculate desired position (behind and above)
          const offset = new THREE.Vector3(0, 4, 6);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), target.mesh.rotation.y);

          const desiredPos = target.mesh.position.clone().add(offset);
          const lookAtTarget = target.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));

          // Smoothly move camera
          this.camera.position.lerp(desiredPos, delta * 5);
          this.camera.lookAt(lookAtTarget);
        }
      } else {
        // No targets left
        this.hudManager.showMessage('NO TARGETS TO SPECTATE', 100);
      }
    }



    // Update Minimap (Always update if BR mode)
    const currentMode = this.gameModeManager.getCurrentMode();
    if (currentMode && currentMode.getName() === 'Battle Royale') {
      const brMode = currentMode as any;
      this.hudManager.updateMinimap(
        { x: this.player.position.x, z: this.player.position.z },
        BATTLE_ROYALE_MAP.size,
        brMode.zoneRadius || 500,
        brMode.zoneCenter || { x: 0, z: 0 },
        this.networkManager.getRemotePlayers().map(p => ({
          x: p.mesh.position.x,
          z: p.mesh.position.z,
          team: (p as any).team
        }))
      );
    }

    if (!this.gameState.running || this.gameState.paused) return;

    // Handle intro sequence
    if (this.introActive) {
      this.updateIntroSequence(delta);
      return;
    }

    // Input - use mobile controls if on mobile, otherwise use keyboard/mouse
    let inputDir: THREE.Vector3 = new THREE.Vector3();
    let wantsToSprint: boolean = false;
    let wantsJump: boolean = false;
    let wantsCrouch: boolean = false;
    let canCutJump: boolean = false;
    let isFiring: boolean = false;

    // Dead check
    if (this.player.isDead()) {
      this.weaponSystem.setVisible(false);
      // Disable rotation if spectating or dead
      if (this.isSpectating) {
        // Spectator camera logic handles rotation
      }
    } else {
      // Input - use mobile controls if on mobile, otherwise use keyboard/mouse
      if (this.isMobile && this.mobileControls) {
        // Mobile input
        this.mobileControls.update();

        // Convert 2D mobile input (x, y) -> 3D world input (x, 0, z)
        inputDir = new THREE.Vector3(
          this.mobileControls.movementInput.x,
          0,
          -this.mobileControls.movementInput.y
        );
        wantsToSprint = inputDir.length() > 0.5;
        wantsJump = this.mobileControls.jumpPressed;
        wantsCrouch = false;
        canCutJump = !this.mobileControls.jumpPressed && this.player.canCutJump;
        isFiring = this.mobileControls.firePressed;

        // Update Game Mode
        // this.gameModeManager.update(delta); // Moved to shared code
        if (this.mobileControls.reloadPressed) {
          this.tryReload();
        }

        // Handle weapon switching
        if (this.mobileControls.weaponSwitchRequested !== 0) {
          this.weaponSystem.scrollWeapon(this.mobileControls.weaponSwitchRequested);
          this.hudManager.updateWeaponName(WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name);
          this.mobileControls.weaponSwitchRequested = 0;
        }

        // Update player rotation from mobile touch
        const mobileLookMultiplier = 1.8;
        this.player.rotation.y -= this.mobileControls.lookDelta.x * mobileLookMultiplier;
        this.player.rotation.x -= this.mobileControls.lookDelta.y * mobileLookMultiplier;
        this.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.player.rotation.x));

        // Jump handling
        if (wantsJump) {
          this.player.jumpBufferTimer = PLAYER_CONFIG.jumpBuffer;
        }
      } else {
        // Desktop input
        this.inputManager.update();
        inputDir = this.inputManager.getMovementInput();
        wantsToSprint = this.inputManager.isActionPressed(GameAction.Sprint) && inputDir.length() > 0;
        wantsJump = this.player.jumpBufferTimer > 0;
        wantsCrouch = this.inputManager.isActionPressed(GameAction.Crouch);
        canCutJump = !this.inputManager.isActionPressed(GameAction.Jump) && this.player.canCutJump;
        isFiring = this.inputManager.isActionPressed(GameAction.Fire);

        // Update player rotation from mouse
        this.player.rotation.y -= this.inputManager.mouse.deltaX;
        this.player.rotation.x -= this.inputManager.mouse.deltaY;
        this.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.player.rotation.x));
        this.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.player.rotation.x));
        this.inputManager.resetMouseDelta();
      }
    }


    // Update Game Mode (Run for both Mobile and Desktop)
    this.gameModeManager.update(delta);

    // Update player
    this.player.update(delta, inputDir, wantsToSprint, wantsJump, wantsCrouch, canCutJump, this.arena.arenaObjects, this.arena.size);
    this.player.updatePowerups(delta);

    // Shooting
    if (isFiring) {
      const { direction, shotFired, directions } = this.weaponSystem.shoot(
        this.camera,
        this.player.onGround,
        this.player.isSprinting,
        this.player.velocity
      );

      if (shotFired) {
        this.gameState.shotsFired++;
        const muzzlePosition = this.weaponSystem.getMuzzleWorldPosition();

        // Network: Send shoot event
        this.networkManager.sendShoot(
          this.camera.position.clone(),
          direction,
          this.weaponSystem.currentWeaponType
        );

        // Handle shotgun pellets or single shot
        if (directions && directions.length > 1) {
          // Shotgun - fire multiple pellets
          directions.forEach(dir => this.handleShooting(dir, true));

          // Create tracer lines for all pellets
          const impacts: THREE.Vector3[] = [];
          directions.forEach(dir => {
            const ray = new THREE.Raycaster(muzzlePosition, dir);
            const intersects = ray.intersectObjects(
              [...this.arena.arenaObjects.map(obj => obj.mesh), ...this.enemyManager.getEnemies().map(e => e.mesh)],
              false
            );
            if (intersects.length > 0) {
              impacts.push(intersects[0].point);
            } else {
              impacts.push(muzzlePosition.clone().add(dir.clone().multiplyScalar(50)));
            }
          });

          if (impacts.length > 0) {
            const tracerProps = this.getTracerProperties();
            this.bulletTracerSystem.createMultipleTracers(muzzlePosition, impacts, tracerProps.color, tracerProps.useFireTexture);
          }
        } else {
          // Single projectile weapon
          this.handleShooting(direction, false);
        }
      }
    }

    // Update weapon
    let mouseMovement = { x: this.inputManager.mouse.deltaX, y: this.inputManager.mouse.deltaY };
    if (this.isMobile && this.mobileControls) {
      mouseMovement = { x: this.mobileControls.lookDelta.x, y: this.mobileControls.lookDelta.y };
    }

    this.weaponSystem.update(
      delta,
      mouseMovement,
      this.player.isSprinting,
      this.player.headBobTime
    );

    this.projectileSystem.update(delta, this.arena.arenaObjects.map(obj => obj.mesh));

    // Update camera
    if (!this.isSpectating) {
      this.updateCamera(delta);
    }

    // Update enemies
    this.enemyManager.update(delta, this.player.position, this.arena.navMeshObstacles, this.arena.arenaObjects, (enemy) => {
      this.handleEnemyShoot(enemy);
    }, (enemy) => {
      // Melee hit callback
      this.player.takeDamage({
        amount: enemy.damage,
        type: DamageType.Melee,
        instigator: enemy
      });

      // Calculate angle for damage indicator
      const dx = enemy.mesh.position.x - this.player.position.x;
      const dz = enemy.mesh.position.z - this.player.position.z;
      const angleToEnemy = Math.atan2(dx, dz) * (180 / Math.PI);
      const playerYaw = this.player.rotation.y * (180 / Math.PI);
      const deltaAngle = angleToEnemy - playerYaw;
      let relativeAngle = (deltaAngle + 180 + 360) % 360;

      if (relativeAngle > 45 && relativeAngle < 315) {
        relativeAngle = 360 - relativeAngle;
      }

      this.hudManager.showDamageVignette(enemy.damage, PLAYER_CONFIG.maxHealth, relativeAngle);
      this.weaponSystem.cameraShake.intensity = Math.max(this.weaponSystem.cameraShake.intensity, 0.05);

      if (this.player.isDead()) {
        this.handleDeath();
      }
    });

    // Update particles, pickups, and new systems
    this.particleSystem.update(delta);
    this.pickupSystem.update(this.player.position, this.player, (amount) =>
      this.weaponSystem.addAmmo(amount)
    );
    this.decalSystem.update(delta);
    this.bulletTracerSystem.update(delta);
    this.damageTextSystem.update(delta);

    // Update arena
    this.arena.update(this.gameTime);

    // Update sky shader
    if (this.skyMaterial) {
      this.skyMaterial.uniforms.time.value = this.gameTime;
    }

    // Update point lights
    this.pointLights.forEach((pl) => {
      pl.light.intensity = pl.baseIntensity * (Math.sin(this.gameTime * 2 + pl.phase) * 0.3 + 0.7);
    });

    // Update HUD
    const horizSpeed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
    const isMoving = horizSpeed > 0.5;
    this.hudManager.updateCrosshair(
      this.weaponSystem.getCurrentSpread(),
      isMoving,
      this.player.isSprinting,
      !this.player.onGround
    );
    if (this.player.powerup) {
      this.hudManager.showPowerup(
        `${this.player.powerup.toUpperCase()} (${Math.ceil(this.player.powerupTimer)}s)`,
        true
      );
    } else {
      this.hudManager.showPowerup('', false);
    }

    // Check wave completion - Moved to SinglePlayerWaveMode

    this.updateHUD();

    if (this.inputManager.isKeyPressed('KeyR')) {
      this.weaponSystem.reload();
    }

    // Scoreboard Toggle (TAB)
    if (this.inputManager.isKeyPressed('Tab')) {
      this.hudManager.toggleScoreboard(true);
    } else {
      this.hudManager.toggleScoreboard(false);
    }
  }

  private handleShooting(direction: THREE.Vector3, isPellet: boolean = false): void {
    const raycaster = new THREE.Raycaster(this.camera.position.clone(), direction);
    let hitEnemy = false;
    const muzzlePosition = this.weaponSystem.getMuzzleWorldPosition();

    // Check Remote Players
    const remotePlayers = this.networkManager.getRemotePlayers();
    remotePlayers.forEach((remotePlayer) => {
      const intersects = raycaster.intersectObject(remotePlayer.mesh, true);
      if (intersects.length > 0) {
        hitEnemy = true; // Count as hit for stats
        const hitPoint = intersects[0].point;
        this.gameState.shotsHit++;

        // Calculate damage
        const weaponConfig = WEAPON_CONFIG[this.weaponSystem.currentWeaponType];
        let damage = weaponConfig.damage;

        // Distance falloff
        const dist = this.player.position.distanceTo(remotePlayer.mesh.position);
        if (weaponConfig.falloff) {
          const { startDistance, endDistance, minDamage } = weaponConfig.falloff;
          if (dist > startDistance) {
            const t = Math.min(1, (dist - startDistance) / (endDistance - startDistance));
            damage = damage * (1 - t) + minDamage * t;
          }
        }

        this.networkManager.sendPlayerHit(remotePlayer.userId, damage, hitPoint);

        // Visuals
        this.damageTextSystem.spawn(hitPoint, damage, false);
        if (!isPellet) {
          this.impactSystem.playBodyImpact(hitPoint);
          this.impactSystem.playHitConfirmation();
        }
      }
    });

    this.enemyManager.getEnemies().forEach((enemy) => {
      const headBox = new THREE.Box3().setFromObject(enemy.head);
      const bodyBox = new THREE.Box3().setFromObject(enemy.body);

      const hitHead = raycaster.ray.intersectsBox(headBox);
      const hitBody = !hitHead && raycaster.ray.intersectsBox(bodyBox);

      if (hitHead || hitBody) {
        hitEnemy = true;
        this.gameState.shotsHit++;
        this.hitStreakCount++;

        const hitPosition = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));

        // Calculate damage with falloff
        const dist = this.player.position.distanceTo(enemy.mesh.position);
        const weaponConfig = WEAPON_CONFIG[this.weaponSystem.currentWeaponType];
        let damage = weaponConfig.damage;

        if (weaponConfig.falloff) {
          const { startDistance, endDistance, minDamage } = weaponConfig.falloff;
          if (dist > startDistance) {
            const t = Math.min(1, (dist - startDistance) / (endDistance - startDistance));
            damage = damage * (1 - t) + minDamage * t;
          }
        }

        const killed = this.enemyManager.damageEnemy(
          enemy,
          {
            amount: damage * this.player.damageMultiplier,
            type: DamageType.Bullet,
            hitLocation: hitHead ? 'head' : 'body',
            instigator: this.player
          }
        );

        // Spawn damage number
        this.damageTextSystem.spawn(
          hitPosition.clone().add(new THREE.Vector3(0, 0.5, 0)),
          damage * this.player.damageMultiplier,
          hitHead
        );

        // Enhanced impact feedback (reduced for pellets to avoid spam)
        if (!isPellet) {
          this.impactSystem.playBodyImpact(hitPosition);
          this.impactSystem.playHitConfirmation();
        }
        this.particleSystem.spawnImpactEffect(hitPosition, killed);

        // Show headshot icon if applicable
        if (killed && hitHead) {
          this.hudManager.showHeadshotIcon();
        }

        // Bullet tracer to hit point (pellets handled separately)
        if (!isPellet) {
          const tracerProps = this.getTracerProperties();
          this.bulletTracerSystem.createTracer(
            muzzlePosition,
            hitPosition,
            killed ? 0xffff00 : tracerProps.color, // Yellow for kills, weapon color otherwise
            killed ? false : tracerProps.useFireTexture // No texture for kill tracers (pure yellow)
          );
        }

        if (killed) {
          this.gameState.kills++;
          this.gameState.score += enemy.score;

          // Multi-kill logic
          const now = performance.now();
          if (now - this.lastKillTime < 3000) {
            this.multiKillCount++;
          } else {
            this.multiKillCount = 1;
          }
          this.lastKillTime = now;

          if (this.multiKillCount > 1) {
            this.hudManager.showMultiKill(this.multiKillCount);
          }

          this.impactSystem.playDeathImpact(hitPosition);
          this.particleSystem.spawn(hitPosition, 0x22c55e, 15);
          this.hudManager.showKillIcon(); // Show kill icon

          if (enemy.type === 'heavy') {
            this.createExplosion(hitPosition, 5, 50);
          }

          // Add to killfeed
          this.hudManager.addKillFeed(
            'Player',
            'Enemy',
            WEAPON_CONFIG[this.weaponSystem.currentWeaponType].name,
            hitHead,
            this.multiKillCount > 1
          );

          this.enemyManager.removeEnemy(enemy);

          if (Math.random() < 0.3) {
            const types = ['health', 'ammo', 'armor'];
            this.pickupSystem.create(
              types[Math.floor(Math.random() * types.length)],
              enemy.mesh.position.clone()
            );
          }
        } else {
          // Non-lethal hit feedback
          this.impactSystem.playBodyImpact(hitPosition);
          this.impactSystem.playHitConfirmation();
        }

        this.hudManager.showHitmarker(killed);

        if (this.hitStreakCount >= 3) {
          this.hudManager.showHitStreak(this.hitStreakCount);
        }
      }
    });

    if (!hitEnemy) {
      this.hitStreakCount = 0;

      // Hit wall/floor - check arena objects for material-based impacts
      const arenaIntersects = raycaster.intersectObjects(
        this.arena.arenaObjects.map(obj => obj.mesh),
        false
      );

      if (arenaIntersects.length > 0) {
        const hit = arenaIntersects[0];
        const hitPoint = hit.point;
        const normal = hit.face?.normal || new THREE.Vector3(0, 1, 0);

        // Find the arena object to get material type
        const arenaObj = this.arena.arenaObjects.find(obj => obj.mesh === hit.object);
        const material = arenaObj?.material || 'default';

        // Surface impact feedback (reduced for pellets)
        if (!isPellet) {
          this.impactSystem.playSurfaceImpact(hitPoint, material as any);
        }

        // Create bullet hole decal
        this.decalSystem.createBulletHole(hitPoint, normal, material as any);

        // Surface debris particles (fewer for pellets)
        if (!isPellet) {
          this.particleSystem.spawnMaterialImpact(hitPoint, normal, material);
        }

        // Bullet tracer handled separately for pellets
        if (!isPellet) {
          const tracerProps = this.getTracerProperties();
          this.bulletTracerSystem.createTracer(muzzlePosition, hitPoint, tracerProps.color, tracerProps.useFireTexture);
        }
      } else {
        // Missed everything (Sky)
        if (!isPellet) {
          const tracerProps = this.getTracerProperties();
          const farPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(100));
          this.bulletTracerSystem.createTracer(muzzlePosition, farPoint, tracerProps.color, tracerProps.useFireTexture);
        }
      }
    }
  }

  private handleEnemyShoot(enemy: Enemy): void {
    // Play enemy shoot sound
    this.enemyManager.playShootSound(enemy);

    if (enemy.muzzleFlash) {
      (enemy.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1;
      setTimeout(() => {
        (enemy.muzzleFlash!.material as THREE.MeshBasicMaterial).opacity = 0;
      }, 50);
    }

    // Calculate direction with distance-based accuracy falloff
    const distToPlayer = enemy.mesh.position.distanceTo(this.player.position);
    const accuracyMultiplier = Math.min(1.0 + distToPlayer * 0.05, 2.0); // Worse at distance
    const spread = enemy.accuracy * accuracyMultiplier;

    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.normalize();

    const shootOrigin = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
    const raycaster = new THREE.Raycaster(shootOrigin, dir);

    // Check for obstacles first - use recursive true to catch all geometry
    const meshes = this.arena.arenaObjects.map(obj => obj.mesh);
    const obstacleIntersects = raycaster.intersectObjects(meshes, true);

    // Player box from bottom to top of player
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        this.player.position.x - 0.5,
        this.player.position.y - PLAYER_CONFIG.height,
        this.player.position.z - 0.5
      ),
      new THREE.Vector3(
        this.player.position.x + 0.5,
        this.player.position.y + 0.2,
        this.player.position.z + 0.5
      )
    );

    // Calculate distance to player
    const distanceToPlayer = shootOrigin.distanceTo(this.player.position);

    // Check if any obstacle is closer than the player (with small buffer)
    const hasObstacleInWay = obstacleIntersects.some(intersect => intersect.distance < distanceToPlayer - 0.5);

    // Calculate angle from player to enemy for directional indicator
    const dx = enemy.mesh.position.x - this.player.position.x;
    const dz = enemy.mesh.position.z - this.player.position.z;
    // World-space angle from player to enemy
    const angleToEnemy = Math.atan2(dx, dz) * (180 / Math.PI);
    const playerYaw = this.player.rotation.y * (180 / Math.PI);
    // Relative angle: enemy directly in front -> 180°, behind -> 0°,
    // right -> 90°, left -> 270° (matches texture: 0° arrow down)
    const delta = angleToEnemy - playerYaw;
    let relativeAngle = (delta + 180 + 360) % 360;

    // Mirror left/right only (preserve front 180° and back 0°)
    // Front/back range: 135-225° (front) and 0-45°/315-360° (back)
    if (relativeAngle > 45 && relativeAngle < 315) {
      // This is a side hit, mirror it: 90° -> 270°, 270° -> 90°
      relativeAngle = 360 - relativeAngle;
    }

    // Expanded near-miss detection box (larger than player hitbox)
    const nearMissBox = new THREE.Box3(
      new THREE.Vector3(
        this.player.position.x - 1.5,
        this.player.position.y - PLAYER_CONFIG.height,
        this.player.position.z - 1.5
      ),
      new THREE.Vector3(
        this.player.position.x + 1.5,
        this.player.position.y + 0.2,
        this.player.position.z + 1.5
      )
    );

    if (!hasObstacleInWay && raycaster.ray.intersectsBox(playerBox)) {
      // ACTUAL HIT - Red indicator with damage
      this.player.takeDamage({
        amount: enemy.damage,
        type: DamageType.Melee,
        instigator: enemy
      });
      const isDead = this.player.isDead();

      // Trigger dramatic damage vignette system (includes directional indicator)
      this.hudManager.showDamageVignette(enemy.damage, PLAYER_CONFIG.maxHealth, relativeAngle);
      this.weaponSystem.cameraShake.intensity = Math.max(this.weaponSystem.cameraShake.intensity, 0.04);

      if (isDead) {
        this.handleDeath();
      }
    } else if (!hasObstacleInWay && raycaster.ray.intersectsBox(nearMissBox)) {
      // NEAR MISS - White indicator warning (no damage)
      this.hudManager.showNearMissIndicator(relativeAngle);

      // Play bullet whiz sound at the closest point on the ray to the player
      const ray = new THREE.Ray(shootOrigin, dir);
      const closestPoint = new THREE.Vector3();
      ray.closestPointToPoint(this.player.position, closestPoint);
      this.impactSystem.playBulletWhiz(closestPoint);
    }
  }

  private updateCamera(delta: number): void {
    this.camera.position.copy(this.player.position);

    // Apply positional shake
    this.camera.position.x += this.weaponSystem.positionalShake.x;
    this.camera.position.y += this.weaponSystem.positionalShake.y;
    this.camera.position.z += this.weaponSystem.positionalShake.z;

    // Apply recoil and camera shake
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y =
      this.player.rotation.y +
      this.weaponSystem.recoilYaw * Math.PI / 180 +
      this.weaponSystem.microShake.x +
      this.weaponSystem.cameraShake.x;
    this.camera.rotation.x =
      this.player.rotation.x -
      this.weaponSystem.recoilPitch * Math.PI / 180 -
      this.weaponSystem.microShake.y +
      this.weaponSystem.cameraShake.y;

    // Camera FOV
    let targetFOV = CAMERA_CONFIG.baseFOV;
    if (this.weaponSystem.isZoomed) {
      targetFOV = 40;
    } else if (this.player.isSprinting) {
      targetFOV = CAMERA_CONFIG.sprintFOV;
    } else if (this.player.isJumping) {
      targetFOV = CAMERA_CONFIG.jumpFOV;
    } else if (!this.player.onGround) {
      targetFOV = CAMERA_CONFIG.landFOV; // Actually landFOV is usually for landing impact, but let's keep existing logic structure
    }

    targetFOV += this.weaponSystem.fovPunch;

    // If zoomed, we want instant or very fast transition
    const lerpSpeed = this.weaponSystem.isZoomed ? 50 : CAMERA_CONFIG.fovLerpSpeed;

    this.player.currentFOV +=
      (targetFOV - this.player.currentFOV) * lerpSpeed * delta;
    this.camera.fov = this.player.currentFOV;
    this.camera.updateProjectionMatrix();

    // Head bob
    const horizSpeed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
    if (horizSpeed > 0.1 && this.player.onGround) {
      const bobMult = this.player.isSprinting ? 1.5 : 1;
      this.player.headBobTime += delta * CAMERA_CONFIG.bobFrequency * bobMult;
      const speedRatio = horizSpeed / PLAYER_CONFIG.walkSpeed;
      this.camera.position.y += Math.sin(this.player.headBobTime) * CAMERA_CONFIG.bobAmplitudeY * speedRatio;
      const sway = Math.cos(this.player.headBobTime * 0.5) * CAMERA_CONFIG.bobAmplitudeX * speedRatio;
      this.camera.position.x += sway * Math.cos(this.player.rotation.y);
      this.camera.position.z += sway * Math.sin(this.player.rotation.y);
    } else if (this.player.onGround) {
      this.player.headBobTime += delta * CAMERA_CONFIG.breathFrequency;
      this.camera.position.y += Math.sin(this.player.headBobTime) * CAMERA_CONFIG.breathAmplitude;
    }

    // Landing/jump effects
    if (this.player.landingImpact > 0) {
      this.camera.position.y -= this.player.landingImpact;
      this.player.landingImpact *= 0.8;
      if (this.player.landingImpact < 0.001) this.player.landingImpact = 0;
    }
    if (this.player.jumpLift > 0) {
      this.camera.position.y += this.player.jumpLift;
      this.player.jumpLift *= 0.85;
      if (this.player.jumpLift < 0.001) this.player.jumpLift = 0;
    }

    // Update post-processing
    this.postProcessing.setChromaAmount(this.weaponSystem.chromaIntensity);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postProcessing.resize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    if (this.gameState.inStartScreen && this.startScreen) {
      this.startScreen.start();
    } else {
      this.lastTime = performance.now();
      if (this.respawnSound && this.respawnSound.buffer) {
        this.respawnSound.play();
      }
      this.animate();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.gameTime += delta;

    this.update(delta);
    this.aiManager.update(delta);
    if (this.networkManager && this.player && this.camera) {
      this.networkManager.update(delta, this.player, this.camera);
    }
    if (this.postProcessing) {
      this.postProcessing.render();
    }
  };

  private createExplosion(position: THREE.Vector3, radius: number, maxDamage: number): void {
    this.explosionSystem.createExplosion(position, radius, maxDamage);
  }
  public handleRemoteDamage(data: any) {
    const { damage, attackerId } = data;
    this.player.takeDamage({
      amount: damage,
      type: DamageType.Bullet,
      instigator: null
    });

    // Directional indicator (simplified for now)
    this.hudManager.showDamageVignette(damage, PLAYER_CONFIG.maxHealth, 0);
    this.weaponSystem.cameraShake.intensity = Math.max(this.weaponSystem.cameraShake.intensity, 0.05);

    if (this.player.isDead()) {
      this.handleDeath();
      // Notify server of death
      this.networkManager.sendPlayerDied(attackerId, 'rifle'); // TODO: Pass actual weapon type if available
    }
  }

  public handleScoreUpdate(scores: any) {
    this.hudManager.updateScoreboard(scores, this.networkManager.myUserId);
  }

  public handleKillFeed(attackerId: string, victimId: string, weaponType: string) {
    const isMe = String(attackerId) === this.networkManager.myUserId;
    const isVictim = String(victimId) === this.networkManager.myUserId;

    const attackerName = isMe ? 'YOU' : `Player ${String(attackerId).substr(0, 4)}`;
    const victimName = isVictim ? 'YOU' : `Player ${String(victimId).substr(0, 4)}`;

    this.hudManager.addKillFeed(
      attackerName,
      victimName,
      weaponType,
      false, // headshot (unknown for now)
      false // multikill (unknown for now)
    );

    if (isMe) {
      this.hudManager.showKillIcon();
      this.impactSystem.playHitConfirmation(); // Or specific kill sound
      this.gameState.kills++;
      this.gameState.score += 100;
    }
  }

  public handleMatchEnd(_finalState: any) {
    this.tryExitPointerLock();
    this.hudManager.showGameOver({
      wave: this.gameState.wave,
      kills: this.gameState.kills,
      accuracy: 0,
      time: "MATCH ENDED",
      score: this.gameState.score
    });

    const gameOverTitle = document.querySelector('#game-over h1');
    if (gameOverTitle) gameOverTitle.textContent = "MATCH COMPLETE";

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.style.display = 'block';
      restartBtn.textContent = "RETURN TO LOBBY";
      restartBtn.onclick = () => {
        window.location.href = '/';
      };
    }
  }


  public handleDeath(): void {
    if (this.isDeadSequenceActive) return;
    this.isDeadSequenceActive = true;

    this.player.playDeathSound();
    this.player.playDeathSound();
    this.hudManager.showKillIcon();
    this.weaponSystem.setVisible(false);

    // Check for Battle Royale Mode
    const currentMode = this.gameModeManager.getCurrentMode();
    console.log('handleDeath called. Current Mode:', currentMode ? currentMode.getName() : 'None');

    if (currentMode && currentMode.getName() === 'Battle Royale') {
      console.log('Player died in Battle Royale - entering Spectator Mode');
      this.isSpectating = true;
      this.hudManager.showMessage('YOU DIED! SPECTATING...', 3000);

      // Find a target to spectate
      const remotePlayers = this.networkManager.getRemotePlayers();
      const enemies = this.enemyManager.getEnemies();
      // Use mesh.uuid as fallback ID for enemies since they don't have a dedicated ID property
      const allTargets = [...remotePlayers.map(p => ({ mesh: p.mesh, id: p.id, name: `Player ${p.id}` })), ...enemies.map(e => ({ mesh: e.mesh, id: e.mesh.uuid, name: 'Enemy' }))];

      if (allTargets.length > 0) {
        this.spectatorTargetId = allTargets[0].id;
        this.hudManager.showSpectatorUI(allTargets[0].name);
      } else {
        this.hudManager.showMessage('NO PLAYERS TO SPECTATE', 3000);
      }
      return; // Skip standard respawn logic
    }

    console.log('Not Battle Royale, proceeding to standard Game Over');

    // Disable controls
    this.tryExitPointerLock();

    // Show UI
    this.hudManager.showGameOver({
      wave: this.gameState.wave,
      kills: this.gameState.kills,
      accuracy: 0,
      time: "0:00",
      score: this.gameState.score
    });

    // Override game over text
    const gameOverTitle = document.querySelector('#game-over h1');
    if (gameOverTitle) gameOverTitle.textContent = "YOU DIED";

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.style.display = 'none';

    // Respawn timer
    let countdown = 3;
    const interval = setInterval(() => {
      if (gameOverTitle) gameOverTitle.textContent = `RESPAWNING IN ${countdown}...`;
      countdown--;
      if (countdown < 0) {
        clearInterval(interval);
        this.respawn();
      }
    }, 1000);
  }

  private respawn(): void {
    this.isDeadSequenceActive = false;
    this.player.reset();
    this.weaponSystem.setVisible(true);
    this.hudManager.hideGameOver();
    this.tryRequestPointerLock();
    this.networkManager.sendPlayerRespawn();

    // Reset UI text
    const gameOverTitle = document.querySelector('#game-over h1');
    if (gameOverTitle) gameOverTitle.textContent = "GAME OVER";
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.style.display = 'none';
  }
  private lastSpectatorSwitchTime = 0;

  private cycleSpectatorTarget(targets: any[], direction: number): void {
    const now = performance.now();
    if (now - this.lastSpectatorSwitchTime < 300) return; // 300ms debounce
    this.lastSpectatorSwitchTime = now;

    const currentIndex = targets.findIndex(t => t.id === this.spectatorTargetId);
    let nextIndex = currentIndex + direction;

    if (nextIndex >= targets.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = targets.length - 1;

    const nextTarget = targets[nextIndex];
    if (nextTarget) {
      this.spectatorTargetId = nextTarget.id;
      this.hudManager.showSpectatorUI(nextTarget.name);
      this.hudManager.showMessage(`SWITCHED TO ${nextTarget.name}`, 1000);
    }
  }
}
