// RIFT Integration - HUD Manager
// Handles all UI elements: health, ammo, crosshair, killfeed, hitmarkers

export interface HUDElements {
  healthBar?: HTMLElement;
  healthText?: HTMLElement;
  armorBar?: HTMLElement;
  armorText?: HTMLElement;
  staminaBar?: HTMLElement;
  ammoDisplay?: HTMLElement;
  ammoReserve?: HTMLElement;
  weaponName?: HTMLElement;
  crosshair?: HTMLElement;
  crosshairTop?: HTMLElement;
  crosshairBottom?: HTMLElement;
  crosshairLeft?: HTMLElement;
  crosshairRight?: HTMLElement;
  hitmarker?: HTMLElement;
  killIcon?: HTMLElement;
  reloadIndicator?: HTMLElement;
  damageOverlay?: HTMLElement;
  scoreDisplay?: HTMLElement;
  waveDisplay?: HTMLElement;
  killfeed?: HTMLElement;
}

export interface KillfeedEntry {
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot: boolean;
  timestamp: number;
}

export class HUDManager {
  private elements: HUDElements = {};
  private killfeedEntries: KillfeedEntry[] = [];
  private maxKillfeedEntries = 5;
  private killfeedTimeout = 5000;

  // Vignette effects
  private damageOverlayTimeout: number | null = null;

  constructor() {
    this.initializeElements();
  }

  private initializeElements(): void {
    // Try to get existing elements from index.html
    this.elements.healthBar = document.getElementById('health-bar') || undefined;
    this.elements.healthText = document.getElementById('health-text') || undefined;
    this.elements.armorBar = document.getElementById('armor-bar') || undefined;
    this.elements.armorText = document.getElementById('armor-text') || undefined;
    this.elements.staminaBar = document.getElementById('stamina-bar') || undefined;
    this.elements.ammoDisplay = document.getElementById('ammo-current') || undefined;
    this.elements.ammoReserve = document.getElementById('ammo-reserve') || undefined;
    this.elements.weaponName = document.getElementById('weapon-name') || undefined;
    this.elements.crosshair = document.getElementById('crosshair') || undefined;
    this.elements.crosshairTop = document.getElementById('crosshair-top') || undefined;
    this.elements.crosshairBottom = document.getElementById('crosshair-bottom') || undefined;
    this.elements.crosshairLeft = document.getElementById('crosshair-left') || undefined;
    this.elements.crosshairRight = document.getElementById('crosshair-right') || undefined;
    this.elements.hitmarker = document.getElementById('hitmarker') || undefined;
    this.elements.killIcon = document.getElementById('kill-icon') || undefined;
    this.elements.reloadIndicator = document.getElementById('reload-indicator') || undefined;
    this.elements.damageOverlay = document.getElementById('damage-vignette') || undefined;
    this.elements.scoreDisplay = document.getElementById('score-display') || undefined;
    this.elements.waveDisplay = document.getElementById('wave-display') || undefined;
    this.elements.killfeed = document.getElementById('killfeed') || undefined;
  }

  // ========== HEALTH/ARMOR/STAMINA ==========

  public updateHealth(health: number, maxHealth: number): void {
    const pct = Math.max(0, (health / maxHealth) * 100);
    
    if (this.elements.healthBar) {
      this.elements.healthBar.style.width = `${pct}%`;
    }
    if (this.elements.healthText) {
      this.elements.healthText.textContent = Math.ceil(health).toString();
    }
  }

  public updateArmor(armor: number, maxArmor: number): void {
    const pct = Math.max(0, (armor / maxArmor) * 100);
    
    if (this.elements.armorBar) {
      this.elements.armorBar.style.width = `${pct}%`;
    }
    if (this.elements.armorText) {
      this.elements.armorText.textContent = Math.ceil(armor).toString();
    }
  }

  public updateStamina(stamina: number, maxStamina: number): void {
    const pct = Math.max(0, (stamina / maxStamina) * 100);
    
    if (this.elements.staminaBar) {
      this.elements.staminaBar.style.width = `${pct}%`;
    }
  }

  // ========== WEAPON/AMMO ==========

  public updateWeaponName(name: string): void {
    if (this.elements.weaponName) {
      this.elements.weaponName.textContent = name;
    }
  }

  public updateAmmo(current: number, reserve: number): void {
    if (this.elements.ammoDisplay) {
      this.elements.ammoDisplay.textContent = current.toString();
      this.elements.ammoDisplay.className = current === 0 ? 'empty' : current <= 5 ? 'low' : '';
    }
    if (this.elements.ammoReserve) {
      this.elements.ammoReserve.textContent = reserve.toString();
    }
  }

  public showReloading(isReloading: boolean): void {
    if (this.elements.reloadIndicator) {
      this.elements.reloadIndicator.style.opacity = isReloading ? '1' : '0';
      if (isReloading) {
        this.elements.reloadIndicator.classList.add('active');
      } else {
        this.elements.reloadIndicator.classList.remove('active');
      }
    }
  }

  // ========== CROSSHAIR ==========

  public updateCrosshair(
    spread: number,
    isMoving: boolean = false,
    isSprinting: boolean = false,
    isAirborne: boolean = false
  ): void {
    let gap = 8 + spread * 10000;

    if (isAirborne) {
      gap *= 1.8;
    } else if (isSprinting) {
      gap *= 1.4;
    } else if (isMoving) {
      gap *= 1.15;
    }

    gap = Math.min(gap, 55);

    if (this.elements.crosshairTop) {
      this.elements.crosshairTop.style.transform = `translateX(-50%) translateY(-${gap}px)`;
    }
    if (this.elements.crosshairBottom) {
      this.elements.crosshairBottom.style.transform = `translateX(-50%) translateY(${gap}px)`;
    }
    if (this.elements.crosshairLeft) {
      this.elements.crosshairLeft.style.transform = `translateY(-50%) translateX(-${gap}px)`;
    }
    if (this.elements.crosshairRight) {
      this.elements.crosshairRight.style.transform = `translateY(-50%) translateX(${gap}px)`;
    }
  }

  // ========== HITMARKERS ==========

  public showHitmarker(isKill: boolean): void {
    if (!this.elements.hitmarker) return;

    const img = this.elements.hitmarker.querySelector('img');

    this.elements.hitmarker.style.opacity = '1';
    this.elements.hitmarker.style.transform = isKill
      ? 'translate(-50%, -50%) scale(1.5)'
      : 'translate(-50%, -50%) scale(1.2)';

    if (img) {
      img.style.filter = isKill
        ? 'drop-shadow(0 0 5px #ef4444) sepia(1) saturate(1000%) hue-rotate(-50deg)'
        : 'drop-shadow(0 0 2px #ffffff)';
    }

    setTimeout(() => {
      if (this.elements.hitmarker) {
        this.elements.hitmarker.style.opacity = '0';
        this.elements.hitmarker.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    }, 100);
  }

  public showHitFeedback(isKill: boolean, isHeadshot: boolean): void {
    if (!this.elements.crosshair) return;

    this.elements.crosshair.classList.remove('hit', 'headshot', 'kill');

    if (isKill) {
      this.elements.crosshair.classList.add('kill');
    } else if (isHeadshot) {
      this.elements.crosshair.classList.add('headshot');
    } else {
      this.elements.crosshair.classList.add('hit');
    }

    setTimeout(() => {
      if (this.elements.crosshair) {
        this.elements.crosshair.classList.remove('hit', 'headshot', 'kill');
      }
    }, 100);
  }

  public showKillIcon(): void {
    if (!this.elements.killIcon) return;

    this.elements.killIcon.style.opacity = '1';
    this.elements.killIcon.style.transform = 'translate(-50%, -50%) scale(1.2)';

    setTimeout(() => {
      if (this.elements.killIcon) {
        this.elements.killIcon.style.transform = 'translate(-50%, -50%) scale(1.0)';
      }
    }, 50);

    setTimeout(() => {
      if (this.elements.killIcon) {
        this.elements.killIcon.style.opacity = '0';
      }
    }, 500);
  }

  // ========== DAMAGE FEEDBACK ==========

  public flashDamage(directionAngle?: number): void {
    if (!this.elements.damageOverlay) return;

    if (this.damageOverlayTimeout !== null) return;

    this.elements.damageOverlay.style.opacity = '1';
    this.elements.damageOverlay.style.filter = 'drop-shadow(0 0 8px red) drop-shadow(0 0 15px red)';

    if (directionAngle !== undefined) {
      this.elements.damageOverlay.style.transform = `translate(-50%, -50%) rotate(${(directionAngle + 180) % 360}deg)`;
    } else {
      this.elements.damageOverlay.style.transform = 'translate(-50%, -50%)';
    }

    this.damageOverlayTimeout = window.setTimeout(() => {
      if (this.elements.damageOverlay) {
        this.elements.damageOverlay.style.opacity = '0';
        this.elements.damageOverlay.style.filter = 'none';
      }
      this.damageOverlayTimeout = null;
    }, 300);
  }

  // ========== SCORE/WAVE ==========

  public updateScore(score: number): void {
    if (this.elements.scoreDisplay) {
      const currentScore = parseInt(this.elements.scoreDisplay.textContent || '0');
      if (score > currentScore) {
        this.elements.scoreDisplay.classList.remove('pop');
        requestAnimationFrame(() => {
          this.elements.scoreDisplay?.classList.add('pop');
        });
      }
      this.elements.scoreDisplay.textContent = score.toString();
    }
  }

  public updateWave(wave: number): void {
    if (this.elements.waveDisplay) {
      this.elements.waveDisplay.textContent = `WAVE ${wave}`;
      this.elements.waveDisplay.style.display = 'block';
    }
  }

  // ========== KILLFEED ==========

  public addKillFeed(killer: string, victim: string, weapon: string, isHeadshot: boolean): void {
    const entry: KillfeedEntry = {
      killer,
      victim,
      weapon,
      isHeadshot,
      timestamp: Date.now()
    };

    this.killfeedEntries.unshift(entry);

    if (this.killfeedEntries.length > this.maxKillfeedEntries) {
      this.killfeedEntries.pop();
    }

    this.renderKillfeed();
  }

  private renderKillfeed(): void {
    if (!this.elements.killfeed) return;

    this.elements.killfeed.innerHTML = '';

    this.killfeedEntries.forEach((entry) => {
      const div = document.createElement('div');
      div.className = 'killfeed-entry';
      
      const headshotIcon = entry.isHeadshot ? ' 🎯' : '';
      div.innerHTML = `
        <span class="killer">${entry.killer}</span>
        <span class="weapon">[${entry.weapon}]${headshotIcon}</span>
        <span class="victim">${entry.victim}</span>
      `;
      
      this.elements.killfeed?.appendChild(div);
    });
  }

  public updateKillfeed(_delta: number): void {
    const now = Date.now();
    const previousCount = this.killfeedEntries.length;
    
    this.killfeedEntries = this.killfeedEntries.filter(
      (entry) => now - entry.timestamp < this.killfeedTimeout
    );

    if (previousCount > 0 && this.killfeedEntries.length !== previousCount) {
      this.renderKillfeed();
    }
  }

  // ========== MESSAGES ==========

  public showMessage(message: string, duration: number = 2000): void {
    const msgDisplay = document.getElementById('message-display');
    if (msgDisplay) {
      msgDisplay.textContent = message;
      msgDisplay.style.opacity = '1';
      setTimeout(() => {
        msgDisplay.style.opacity = '0';
      }, duration);
    }
  }

  // ========== VISIBILITY ==========

  public hideHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'none';
    }
  }

  public showHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'block';
    }
  }

  public toggleScope(show: boolean): void {
    const sniperScope = document.getElementById('sniper-scope');
    if (sniperScope) {
      sniperScope.style.opacity = show ? '1' : '0';
    }
    if (this.elements.crosshair) {
      this.elements.crosshair.style.opacity = show ? '0' : '1';
    }
  }

  public showPauseMenu(show: boolean): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.style.display = show ? 'flex' : 'none';
    }
  }

  public showGameOver(stats: { wave: number; kills: number; accuracy: number; time: string; score: number }): void {
    const gameOver = document.getElementById('game-over');
    if (gameOver) {
      gameOver.style.display = 'flex';
      
      const finalScore = document.getElementById('final-score');
      const finalWaves = document.getElementById('final-waves');
      const finalKills = document.getElementById('final-kills');
      const finalAccuracy = document.getElementById('final-accuracy');
      const finalTime = document.getElementById('final-time');

      if (finalScore) finalScore.textContent = stats.score.toString();
      if (finalWaves) finalWaves.textContent = stats.wave.toString();
      if (finalKills) finalKills.textContent = stats.kills.toString();
      if (finalAccuracy) finalAccuracy.textContent = stats.accuracy.toString();
      if (finalTime) finalTime.textContent = stats.time;
    }
  }

  public hideGameOver(): void {
    const gameOver = document.getElementById('game-over');
    if (gameOver) {
      gameOver.style.display = 'none';
    }
  }

  public show(): void {
    const riftHud = document.getElementById('rift-hud');
    if (riftHud) {
      riftHud.classList.add('visible');
    }
  }

  public hide(): void {
    const riftHud = document.getElementById('rift-hud');
    if (riftHud) {
      riftHud.classList.remove('visible');
    }
  }

  public reset(): void {
    this.killfeedEntries = [];
    this.renderKillfeed();
  }
}
