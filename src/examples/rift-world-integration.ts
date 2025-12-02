/**
 * RIFT Integration Example
 * 
 * This file shows how to integrate the RIFT systems into the existing Drift World.ts
 * Copy the relevant sections into your World.ts to enable RIFT features.
 */

// ============================================================================
// STEP 1: Add these imports at the top of World.ts
// ============================================================================

// Add these imports after the existing Three.js imports
/*
import { RIFTIntegration } from './rift-integration';
// Or import individual systems:
import { ParticleSystem } from './systems/ParticleSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { DecalSystem, SurfaceMaterial } from './systems/DecalSystem';
import { BulletTracerSystem } from './systems/BulletTracerSystem';
import { HUDManager } from './ui/HUDManager';
import { AudioManager } from './managers/AudioManager';

// Game Modes
import { GameModeManager, GameModeType } from './gamemodes';

// Network (for multiplayer)
import { NetworkManager } from './network';

// Lobby (for matchmaking UI)
import { LobbyManager, LobbyUI, LobbyEventType } from './lobby';
*/

// ============================================================================
// STEP 2: Add RIFT properties to the World class
// ============================================================================

// Add these to the class properties (around line 30):
/*
public rift!: RIFTIntegration;
public gameModeManager!: GameModeManager;
public networkManager!: NetworkManager;
public lobbyManager!: LobbyManager;
public lobbyUI!: LobbyUI;
*/

// ============================================================================
// STEP 3: Initialize RIFT after scene is created
// ============================================================================

// Add this at the end of _initScene() method (around line 298):
/*
// Initialize RIFT integration
this.rift = new RIFTIntegration(this.scene, this.camera);

// Initialize Game Modes
this.gameModeManager = new GameModeManager(this);
this.gameModeManager.setMode(GameModeType.FREE_FOR_ALL); // Default mode

// Initialize Network (for multiplayer - optional)
this.networkManager = new NetworkManager();

// Initialize Lobby
this.lobbyManager = new LobbyManager('http://localhost:3000');
this.lobbyUI = new LobbyUI(this.lobbyManager);

// Setup lobby event handlers
this.setupLobbyEvents();
*/

// ============================================================================
// STEP 4: Setup Lobby Events
// ============================================================================

/*
private setupLobbyEvents(): void {
  // Handle match found
  this.lobbyManager.on(LobbyEventType.MATCH_FOUND, (data) => {
    console.log('Match found!', data);
    // Could show accept/decline popup
  });

  // Handle match starting
  this.lobbyManager.on(LobbyEventType.MATCH_STARTING, async (data: any) => {
    // Connect to game server
    const connected = await this.networkManager.connect(
      data.serverUrl,
      data.token,
      data.matchId
    );
    
    if (connected) {
      // Hide lobby, start game
      this.lobbyUI.hide();
      this.startMultiplayerGame(data.modeId);
    }
  });

  // Handle queue updates (for showing wait time)
  this.lobbyManager.on(LobbyEventType.QUEUE_UPDATE, (status) => {
    console.log('Queue time:', status.queueTime);
  });
}

private startMultiplayerGame(modeId: string): void {
  // Map lobby mode ID to GameModeType
  const modeMap: { [key: string]: GameModeType } = {
    'ffa': GameModeType.FREE_FOR_ALL,
    'tdm': GameModeType.TEAM_DEATHMATCH,
    'wave': GameModeType.WAVE_SURVIVAL
  };
  
  const gameMode = modeMap[modeId] || GameModeType.FREE_FOR_ALL;
  this.gameModeManager.setMode(gameMode);
  this.gameModeManager.start();
}
*/

// ============================================================================
// STEP 4: Update RIFT in the animate loop
// ============================================================================

// Add this to the animate() method (around line 565, after entityManager.update):
/*
// Get mouse movement from controls
const mouseMovement = this.fpsControls.getMouseDelta?.() || { x: 0, y: 0 };
const isSprinting = this.player.isSprinting || false;
const headBobTime = this.fpsControls.headBobTime || 0;

// Update RIFT systems
this.rift.update(delta, mouseMovement, isSprinting, headBobTime);

// Update weapon HUD
this.rift.updateWeaponHUD();

// Update health HUD
this.rift.updateHealthHUD(this.player.health, this.player.maxHealth);
*/

// ============================================================================
// STEP 5: Modify addBullet to use RIFT tracers and impacts
// ============================================================================

// Replace or modify the addBullet method:
/*
addBullet(owner: any, ray: any): this {
  const bulletLine = this.assetManager.models.get('bulletLine').clone();
  bulletLine.visible = false;

  const bullet = new Bullet(owner, ray);
  bullet.setRenderComponent(bulletLine, sync);

  // If owner is player, use RIFT weapon system for visual effects
  if (owner === this.player) {
    const muzzlePos = this.rift.weaponSystem.getMuzzlePosition();
    const hitPos = ray.origin.clone().add(ray.direction.clone().multiplyScalar(100));
    
    // Create tracer
    this.rift.createBulletTracer(muzzlePos, hitPos);
  }

  this.add(bullet);
  return this;
}
*/

// ============================================================================
// STEP 6: Modify checkProjectileIntersection for hit effects
// ============================================================================

// Add RIFT effects when a hit is detected:
/*
checkProjectileIntersection(projectile: any, intersectionPoint: any) {
  // ... existing code to find hittedEntity ...
  
  if (hittedEntity) {
    const isEnemy = hittedEntity instanceof Enemy;
    const normal = projectile.ray.direction.clone().negate();
    
    // Spawn impact particles
    this.rift.spawnImpact(intersectionPoint, normal, 'default', isEnemy);
    
    // Create bullet hole decal (not on enemies)
    if (!isEnemy) {
      this.rift.createBulletHole(intersectionPoint, normal);
    }
    
    // Show HUD feedback if player scored the hit
    if (projectile.owner === this.player) {
      const isKill = hittedEntity.health <= 0;
      const isHeadshot = checkIfHeadshot(intersectionPoint, hittedEntity);
      this.rift.showHit(isKill, isHeadshot);
    }
  }
  
  return hittedEntity;
}
*/

// ============================================================================
// STEP 7: Add weapon controls to FirstPersonControls
// ============================================================================

// Add these event handlers to FirstPersonControls.ts:
/*
// In connect() method, add:
document.addEventListener('mousedown', this._onMouseDown, false);
document.addEventListener('mouseup', this._onMouseUp, false);
document.addEventListener('wheel', this._onWheel, false);
document.addEventListener('keydown', this._onKeyDown, false);

// Add methods:
private _onMouseDown = (event: MouseEvent): void => {
  if (!this.isLocked) return;
  
  if (event.button === 0) {
    // Left click - start shooting
    this.world.rift.weaponSystem.setFiring(true);
  } else if (event.button === 2) {
    // Right click - toggle zoom
    this.world.rift.weaponSystem.toggleZoom();
  }
};

private _onMouseUp = (event: MouseEvent): void => {
  if (event.button === 0) {
    this.world.rift.weaponSystem.setFiring(false);
  }
};

private _onWheel = (event: WheelEvent): void => {
  if (!this.isLocked) return;
  
  // Weapon switching with scroll wheel
  if (event.deltaY > 0) {
    this.world.rift.weaponSystem.nextWeapon();
  } else {
    this.world.rift.weaponSystem.previousWeapon();
  }
};

private _onKeyDown = (event: KeyboardEvent): void => {
  if (!this.isLocked) return;
  
  // R to reload
  if (event.code === 'KeyR') {
    this.world.rift.weaponSystem.reload();
  }
  
  // Number keys to switch weapons
  const weaponMap: { [key: string]: WeaponType } = {
    'Digit1': WeaponType.Pistol,
    'Digit2': WeaponType.M4,
    'Digit3': WeaponType.AK47,
    'Digit4': WeaponType.Shotgun,
    'Digit5': WeaponType.AWP,
    'Digit6': WeaponType.Sniper,
    'Digit7': WeaponType.LMG,
    'Digit8': WeaponType.Scar,
    'Digit9': WeaponType.Tec9,
  };
  
  if (weaponMap[event.code]) {
    this.world.rift.weaponSystem.switchWeapon(weaponMap[event.code]);
  }
};
*/

// ============================================================================
// STEP 8: Add required HTML elements for HUD
// ============================================================================

// Add these to your index.html inside <body>:
/*
<!-- RIFT HUD Elements -->
<div id="rift-hud">
  <!-- Health & Armor -->
  <div id="health-container">
    <div id="health-bar" class="bar"></div>
    <span id="health-text">100</span>
  </div>
  <div id="armor-container">
    <div id="armor-bar" class="bar"></div>
    <span id="armor-text">0</span>
  </div>
  
  <!-- Ammo -->
  <div id="ammo-container">
    <span id="ammo-current">30</span>
    <span id="ammo-reserve">/ 120</span>
  </div>
  <span id="weapon-name">M4</span>
  
  <!-- Crosshair -->
  <div id="crosshair">
    <div id="crosshair-top"></div>
    <div id="crosshair-bottom"></div>
    <div id="crosshair-left"></div>
    <div id="crosshair-right"></div>
    <div id="crosshair-center"></div>
  </div>
  
  <!-- Hit Feedback -->
  <div id="hitmarker"></div>
  <div id="kill-icon"></div>
  
  <!-- Damage Vignette -->
  <div id="damage-vignette"></div>
  
  <!-- Killfeed -->
  <div id="killfeed"></div>
  
  <!-- Reload Indicator -->
  <div id="reload-indicator">RELOADING</div>
</div>
*/

// ============================================================================
// STEP 9: Add CSS styles for HUD
// ============================================================================

// Add these styles to your main.css:
/*
#rift-hud {
  position: fixed;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

#health-container, #armor-container {
  position: absolute;
  bottom: 40px;
  left: 40px;
  width: 200px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
}

#armor-container {
  bottom: 70px;
}

.bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.2s;
}

#health-bar {
  background: linear-gradient(to right, #ff0000, #ff4444);
}

#armor-bar {
  background: linear-gradient(to right, #0066ff, #00aaff);
}

#ammo-container {
  position: absolute;
  bottom: 40px;
  right: 40px;
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 32px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

#weapon-name {
  position: absolute;
  bottom: 80px;
  right: 40px;
  font-size: 18px;
  color: #888;
}

#crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

#crosshair > div {
  position: absolute;
  background: white;
  transition: transform 0.1s;
}

#crosshair-top, #crosshair-bottom {
  width: 2px;
  height: 10px;
  left: -1px;
}

#crosshair-top { bottom: 5px; }
#crosshair-bottom { top: 5px; }

#crosshair-left, #crosshair-right {
  width: 10px;
  height: 2px;
  top: -1px;
}

#crosshair-left { right: 5px; }
#crosshair-right { left: 5px; }

#crosshair-center {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  left: -2px;
  top: -2px;
}

#hitmarker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  opacity: 0;
  background-image: url('data:image/svg+xml,...'); // hitmarker SVG
  pointer-events: none;
}

#damage-vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  box-shadow: inset 0 0 100px rgba(255, 0, 0, 0);
  transition: box-shadow 0.3s;
}

#killfeed {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

#reload-indicator {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: white;
  opacity: 0;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}
*/

export {};
