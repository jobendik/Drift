import { KillfeedManager } from './KillfeedManager';

export class HUDManager {
  private healthBarMask: HTMLElement;
  private healthText: HTMLElement;
  private healthWrapper: HTMLElement;
  private armorBarMask: HTMLElement;
  private armorText: HTMLElement;
  private staminaBarMask: HTMLElement;
  private staminaText: HTMLElement;
  private weaponName: HTMLElement;
  private ammoDisplay: HTMLElement;
  private waveDisplay: HTMLElement;
  private scoreDisplay: HTMLElement;
  private enemiesDisplay: HTMLElement;
  private reloadIndicator: HTMLElement;
  private powerupIndicator: HTMLElement;
  private damageOverlay: HTMLElement;
  private sniperScope: HTMLElement;
  private crosshair: HTMLElement;
  private crosshairTop: HTMLElement;
  private crosshairBottom: HTMLElement;
  private crosshairLeft: HTMLElement;
  private crosshairRight: HTMLElement;
  private killIcon: HTMLElement;
  private headshotIcon: HTMLElement;
  private multiKillDisplay: HTMLElement;
  private streakDisplay: HTMLElement;
  private multiKillTimeout: number | null = null;
  private streakTimeout: number | null = null;

  public killfeed: KillfeedManager;

  // Vignette system
  private vignetteImpactFlash: HTMLElement;
  private vignetteDamagePulse: HTMLElement;
  private vignetteCritical: HTMLElement;
  private impactFlashTimeout: number | null = null;
  private damagePulseTimeout: number | null = null;
  private damageOverlayTimeout: number | null = null;

  // Sprint overlay
  private sprintOverlay: HTMLElement;

  constructor() {
    this.killfeed = new KillfeedManager();
    this.healthBarMask = document.getElementById('health-bar-mask')!;
    this.healthText = document.getElementById('health-text-value')!;
    this.healthWrapper = document.getElementById('health-wrapper')!;
    this.armorBarMask = document.getElementById('armor-bar-mask')!;
    this.armorText = document.getElementById('armor-text-value')!;
    this.staminaBarMask = document.getElementById('stamina-bar-mask')!;
    this.staminaText = document.getElementById('stamina-text-value')!;
    this.weaponName = document.getElementById('weapon-name')!;
    this.ammoDisplay = document.getElementById('ammo-display')!;
    this.waveDisplay = document.getElementById('wave-display')!;
    this.scoreDisplay = document.getElementById('score-display')!;
    this.enemiesDisplay = document.getElementById('enemies-remaining')!;
    this.reloadIndicator = document.getElementById('reload-indicator')!;
    this.powerupIndicator = document.getElementById('powerup-indicator')!;
    this.damageOverlay = document.getElementById('damage-overlay')!;
    this.sniperScope = document.getElementById('sniper-scope')!;
    this.crosshair = document.getElementById('crosshair')!;
    this.crosshairTop = document.getElementById('cross-top')!;
    this.crosshairBottom = document.getElementById('cross-bottom')!;
    this.crosshairLeft = document.getElementById('cross-left')!;
    this.crosshairRight = document.getElementById('cross-right')!;
    this.killIcon = document.getElementById('kill-icon')!;
    this.headshotIcon = document.getElementById('headshot-icon')!;
    this.multiKillDisplay = document.getElementById('multikill-display')!;
    this.streakDisplay = document.getElementById('streak-display')!;

    // Vignette system
    this.vignetteImpactFlash = document.getElementById('vignette-impact-flash')!;
    this.vignetteDamagePulse = document.getElementById('vignette-damage-pulse')!;
    this.vignetteCritical = document.getElementById('vignette-critical')!;

    // Sprint overlay
    this.sprintOverlay = document.getElementById('sprint-overlay')!;

    // Hide wave display by default
    if (this.waveDisplay) this.waveDisplay.style.display = 'none';
  }

  public updateHealth(health: number, maxHealth: number): void {
    if (!this.healthBarMask) return;
    const pct = Math.max(0, (health / maxHealth) * 100);
    this.healthBarMask.style.width = `${pct}%`;
    this.healthText.textContent = Math.ceil(health).toString();

    // Update health bar color based on percentage
    if (pct <= 25) {
      this.healthBarMask.style.background = 'linear-gradient(90deg, #ff6b6b, #fa5252)';
      this.healthBarMask.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.8)';
    } else if (pct <= 50) {
      this.healthBarMask.style.background = 'linear-gradient(90deg, #ffd43b, #fab005)';
      this.healthBarMask.style.boxShadow = '0 0 10px rgba(255, 212, 59, 0.6)';
    } else {
      this.healthBarMask.style.background = 'linear-gradient(90deg, #51cf66, #40c057)';
      this.healthBarMask.style.boxShadow = '0 0 10px rgba(81, 207, 102, 0.5)';
    }

    // Update critical vignette based on HP
    this.updateCriticalVignette(pct);

    // Low health bar animation
    if (pct < 25) {
      this.healthWrapper.classList.add('critical');
    } else {
      this.healthWrapper.classList.remove('critical');
    }
  }

  private updateCriticalVignette(healthPercent: number): void {
    if (!this.vignetteCritical) return;
    if (healthPercent < 15) {
      // Very critical - intense pulsing
      this.vignetteCritical.style.opacity = '1';
      this.vignetteCritical.classList.add('pulsing');
    } else if (healthPercent < 30) {
      // Critical - strong visible vignette with pulsing
      this.vignetteCritical.style.opacity = '0.85';
      this.vignetteCritical.classList.add('pulsing');
    } else if (healthPercent < 50) {
      // Moderate damage - noticeable vignette
      this.vignetteCritical.style.opacity = '0.55';
      this.vignetteCritical.classList.remove('pulsing');
    } else if (healthPercent < 75) {
      // Light damage - subtle warning
      this.vignetteCritical.style.opacity = '0.25';
      this.vignetteCritical.classList.remove('pulsing');
    } else {
      // Healthy - fade out
      this.vignetteCritical.style.opacity = '0';
      this.vignetteCritical.classList.remove('pulsing');
    }
  }

  public updateArmor(armor: number, maxArmor: number): void {
    if (!this.armorBarMask) return;
    const pct = Math.max(0, (armor / maxArmor) * 100);
    this.armorBarMask.style.width = `${pct}%`;
    this.armorText.textContent = Math.ceil(armor).toString();
  }

  public updateStamina(stamina: number, maxStamina: number): void {
    if (!this.staminaBarMask) return;
    const pct = Math.max(0, (stamina / maxStamina) * 100);
    this.staminaBarMask.style.width = `${pct}%`;
    this.staminaText.textContent = Math.ceil(stamina).toString();
  }

  public setSprintEffect(isSprinting: boolean): void {
    if (!this.sprintOverlay) return;
    if (isSprinting) {
      this.sprintOverlay.classList.add('active');
    } else {
      this.sprintOverlay.classList.remove('active');
    }
  }

  public updateWeaponName(name: string): void {
    if (this.weaponName) this.weaponName.textContent = name;
  }

  public updateAmmo(current: number, reserve: number): void {
    if (!this.ammoDisplay) return;
    this.ammoDisplay.textContent = `${current} / ${reserve}`;
    this.ammoDisplay.className = current === 0 ? 'empty' : current <= 5 ? 'low' : '';
  }

  private currentWave: number = 0;

  public updateWave(wave: number): void {
    if (!this.waveDisplay) return;
    // Only show animation when wave actually changes
    if (wave === this.currentWave) return;
    this.currentWave = wave;

    // Update wave text inside the span (not the whole container)
    const waveText = this.waveDisplay.querySelector('.wave-text');
    if (waveText) {
      waveText.textContent = `WAVE ${wave}`;
    } else {
      this.waveDisplay.textContent = `WAVE ${wave}`;
    }

    // Trigger wave start animation
    this.waveDisplay.classList.remove('active', 'wave-start');

    // Use requestAnimationFrame to restart animation without blocking
    requestAnimationFrame(() => {
      this.waveDisplay.classList.add('wave-start');
    });

    // After animation, settle into active state
    setTimeout(() => {
      this.waveDisplay.classList.remove('wave-start');
      this.waveDisplay.classList.add('active');
    }, 1500); // Match animation duration (1.5s from CSS)
  }

  public updateScore(score: number): void {
    if (!this.scoreDisplay) return;
    const currentScore = parseInt(this.scoreDisplay.textContent || '0');
    if (score > currentScore) {
      this.scoreDisplay.classList.remove('pop');

      // Use requestAnimationFrame to restart animation without blocking
      requestAnimationFrame(() => {
        this.scoreDisplay.classList.add('pop');
      });
    }
    this.scoreDisplay.textContent = score.toString();
  }

  public updateEnemiesRemaining(count: number): void {
    if (!this.enemiesDisplay) return;
    // Update the count element inside the enemies display
    const countEl = this.enemiesDisplay.querySelector('.enemies-count');
    if (countEl) {
      countEl.textContent = count.toString();
    } else {
      this.enemiesDisplay.textContent = `Enemies: ${count}`;
    }
  }

  public showReloading(isReloading: boolean): void {
    if (!this.reloadIndicator) return;
    if (isReloading) {
      this.reloadIndicator.style.opacity = '1';
      this.reloadIndicator.classList.add('active');
    } else {
      this.reloadIndicator.style.opacity = '0';
      this.reloadIndicator.classList.remove('active');
    }
  }

  public showPowerup(text: string, show: boolean): void {
    if (!this.powerupIndicator) return;
    this.powerupIndicator.textContent = text;
    this.powerupIndicator.style.opacity = show ? '1' : '0';
  }

  public flashDamage(directionAngle?: number): void {
    if (!this.damageOverlay) return;
    // Debounce to prevent duplicate visual indicators
    if (this.damageOverlayTimeout !== null) {
      // Already showing damage indicator, skip this call
      return;
    }

    this.damageOverlay.style.opacity = '1';
    // RED indicator - drop-shadow creates a red glow effect
    this.damageOverlay.style.filter = 'drop-shadow(0 0 8px red) drop-shadow(0 0 15px red)';

    if (directionAngle !== undefined) {
      // Rotate the damage indicator to point towards the source of damage
      // The image points down by default, so we adjust accordingly
      this.damageOverlay.style.transform = `translate(-50%, -50%) rotate(${(directionAngle + 180) % 360}deg)`;
    } else {
      // Generic damage (no specific direction)
      this.damageOverlay.style.transform = 'translate(-50%, -50%)';
    }

    this.damageOverlayTimeout = setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
      this.damageOverlay.style.filter = 'none';
      this.damageOverlayTimeout = null;
    }, 300) as unknown as number;
  }

  public showNearMissIndicator(directionAngle: number): void {
    if (!this.damageOverlay) return;
    // Clear any existing timeout to prevent conflicts
    if (this.damageOverlayTimeout !== null) {
      clearTimeout(this.damageOverlayTimeout);
    }

    // WHITE indicator for near misses - bright white glow
    this.damageOverlay.style.opacity = '0.5'; // Less intense than actual hit
    this.damageOverlay.style.filter = 'drop-shadow(0 0 8px white) drop-shadow(0 0 15px white)';

    // Rotate to show direction of incoming fire (flip front/back only)
    this.damageOverlay.style.transform = `translate(-50%, -50%) rotate(${(directionAngle + 180) % 360}deg)`;

    this.damageOverlayTimeout = setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
      this.damageOverlay.style.filter = 'none'; // Reset filter
      this.damageOverlayTimeout = null;
    }, 150) as unknown as number; // Shorter duration than actual hit
  }

  public showDamageVignette(damageAmount: number, maxHealth: number, directionAngle?: number): void {
    if (!this.vignetteImpactFlash || !this.vignetteDamagePulse) return;
    // Calculate damage intensity (0-1)
    const damagePercent = (damageAmount / maxHealth) * 100;
    const intensity = Math.min(damagePercent / 50, 1.0); // Cap at 50% of max health for full intensity

    // LAYER 1: Impact Flash (instant, sharp)
    if (this.impactFlashTimeout) clearTimeout(this.impactFlashTimeout);
    this.vignetteImpactFlash.style.opacity = Math.min(0.9, 0.5 + intensity * 0.7).toString();

    // Optional directional impact (stronger on the side of the hit)
    if (directionAngle !== undefined) {
      const radians = (directionAngle * Math.PI) / 180;
      const x = Math.sin(radians) * 10;
      const y = -Math.cos(radians) * 10;
      this.vignetteImpactFlash.style.transform = `translate(${x}%, ${y}%)`;
    } else {
      this.vignetteImpactFlash.style.transform = 'translate(0, 0)';
    }

    this.impactFlashTimeout = window.setTimeout(() => {
      this.vignetteImpactFlash.style.opacity = '0';
      this.vignetteImpactFlash.style.transform = 'translate(0, 0)';
    }, 120);

    // LAYER 2: Damage Pulse (expanding glow)
    if (this.damagePulseTimeout) clearTimeout(this.damagePulseTimeout);

    // Color based on damage severity
    const pulseColor = damagePercent > 30
      ? 'rgba(255, 0, 51, INTENSITY)' // Heavy hit - bright red
      : 'rgba(255, 165, 0, INTENSITY)'; // Light hit - orange

    const pulseIntensity = Math.max(0.6, intensity * 1.2); // Much more visible
    this.vignetteDamagePulse.style.background = `
      radial-gradient(
        ellipse at center,
        transparent 30%,
        ${pulseColor.replace('INTENSITY', (pulseIntensity * 0.3).toString())} 45%,
        ${pulseColor.replace('INTENSITY', (pulseIntensity * 0.7).toString())} 60%,
        ${pulseColor.replace('INTENSITY', (pulseIntensity * 0.95).toString())} 75%,
        ${pulseColor.replace('INTENSITY', (pulseIntensity * 0.8).toString())} 90%
      )
    `;

    this.vignetteDamagePulse.style.opacity = Math.min(pulseIntensity, 0.95).toString();
    this.vignetteDamagePulse.classList.add('pulsing');

    // Expand pulse
    setTimeout(() => {
      this.vignetteDamagePulse.classList.remove('pulsing');
    }, 100);

    this.damagePulseTimeout = window.setTimeout(() => {
      this.vignetteDamagePulse.style.opacity = '0';
    }, 400);

    // Show directional damage arrow (red for hits)
    if (directionAngle !== undefined) {
      this.flashDamage(directionAngle);
    }
  }

  public showHitmarker(isKill: boolean): void {
    const hitmarker = document.getElementById('hitmarker')!;
    if (!hitmarker) return;
    const img = hitmarker.querySelector('img');

    hitmarker.style.opacity = '1';
    hitmarker.style.transform = isKill
      ? 'translate(-50%, -50%) scale(1.5)'
      : 'translate(-50%, -50%) scale(1.2)';

    if (img) {
      img.style.filter = isKill
        ? 'drop-shadow(0 0 5px #ef4444) sepia(1) saturate(1000%) hue-rotate(-50deg)' // Red for kill
        : 'drop-shadow(0 0 2px #ffffff)'; // White for hit
    }

    setTimeout(() => {
      hitmarker.style.opacity = '0';
      hitmarker.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
  }

  public toggleScope(show: boolean): void {
    if (this.sniperScope) this.sniperScope.style.opacity = show ? '1' : '0';
    if (this.crosshair) this.crosshair.style.opacity = show ? '0' : '1';
  }

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

  public updateCrosshair(spread: number, isMoving: boolean = false, isSprinting: boolean = false, isAirborne: boolean = false): void {
    if (!this.crosshairTop) return;
    // Map spread directly to crosshair gap - AAA FPS standard
    // Base gap: 8px for tight feel, spread multiplier: 10000 for proper visibility
    // CS:GO/Valorant style: minimal base, reactive to shooting
    let gap = 8 + spread * 10000;

    // Movement penalties (visual representation of accuracy loss)
    if (isAirborne) {
      gap *= 1.8; // Significant penalty when jumping
    } else if (isSprinting) {
      gap *= 1.4; // Running reduces accuracy
    } else if (isMoving) {
      gap *= 1.15; // Walking slightly reduces accuracy
    }

    // Clamp maximum gap to prevent screen-filling crosshair (AAA games cap at ~50-60px)
    gap = Math.min(gap, 55);

    // Apply the gap to each line
    this.crosshairTop.style.transform = `translateX(-50%) translateY(-${gap}px)`;
    this.crosshairBottom.style.transform = `translateX(-50%) translateY(${gap}px)`;
    this.crosshairLeft.style.transform = `translateY(-50%) translateX(-${gap}px)`;
    this.crosshairRight.style.transform = `translateY(-50%) translateX(${gap}px)`;
  }

  public showHitFeedback(isKill: boolean, isHeadshot: boolean): void {
    if (!this.crosshair) return;
    // Remove any existing feedback classes
    this.crosshair.classList.remove('hit', 'headshot', 'kill');

    // Add appropriate feedback class
    if (isKill) {
      this.crosshair.classList.add('kill');
    } else if (isHeadshot) {
      this.crosshair.classList.add('headshot');
    } else {
      this.crosshair.classList.add('hit');
    }

    // Remove the class after animation
    setTimeout(() => {
      this.crosshair.classList.remove('hit', 'headshot', 'kill');
    }, 100);
  }

  public showPauseMenu(show: boolean): void {
    const menu = document.getElementById('pause-menu');
    if (menu) menu.style.display = show ? 'flex' : 'none';
  }

  public hideWaveDisplay(): void {
    if (this.waveDisplay) this.waveDisplay.style.display = 'none';
  }

  public showWaveDisplay(): void {
    if (this.waveDisplay) this.waveDisplay.style.display = 'block';
  }

  public hideStartScreen(): void {
    const screen = document.getElementById('start-screen');
    if (screen) screen.style.display = 'none';
  }

  public showKillIcon(): void {
    if (!this.killIcon) return;
    this.killIcon.style.opacity = '1';
    this.killIcon.style.transform = 'translate(-50%, -50%) scale(1.2)';

    setTimeout(() => {
      this.killIcon.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }, 50);

    setTimeout(() => {
      this.killIcon.style.opacity = '0';
    }, 500);
  }

  public showHeadshotIcon(): void {
    if (!this.headshotIcon) return;
    this.headshotIcon.style.opacity = '1';
    this.headshotIcon.style.transform = 'translate(-50%, -50%) scale(1.2)';

    setTimeout(() => {
      this.headshotIcon.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }, 50);

    setTimeout(() => {
      this.headshotIcon.style.opacity = '0';
    }, 500);
  }

  public showMultiKill(count: number): void {
    if (!this.multiKillDisplay) return;
    let text = '';
    let tierClass = '';

    switch (count) {
      case 2: text = 'DOUBLE KILL'; tierClass = 'impact-tier-1'; break;
      case 3: text = 'TRIPLE KILL'; tierClass = 'impact-tier-2'; break;
      case 4: text = 'QUAD KILL'; tierClass = 'impact-tier-3'; break;
      case 5: text = 'PENTA KILL'; tierClass = 'impact-tier-3'; break;
      default: text = 'GODLIKE'; tierClass = 'impact-tier-4'; break;
    }

    // Update text inside the span (if exists) or container
    const textEl = this.multiKillDisplay.querySelector('.multikill-text');
    if (textEl) {
      textEl.textContent = text;
    } else {
      this.multiKillDisplay.textContent = text;
    }
    
    this.multiKillDisplay.className = ''; // Clear classes
    this.multiKillDisplay.style.opacity = '1';

    // Use requestAnimationFrame to restart animation without blocking
    requestAnimationFrame(() => {
      this.multiKillDisplay.classList.add('impact-text', tierClass, 'shake');
    });

    if (this.multiKillTimeout) clearTimeout(this.multiKillTimeout);
    this.multiKillTimeout = window.setTimeout(() => {
      this.multiKillDisplay.style.opacity = '0';
      this.multiKillDisplay.className = '';
    }, 3000);
  }

  public showHitStreak(count: number): void {
    if (!this.streakDisplay) return;
    if (count < 3) return; // Show from 3 hits

    // Update text inside the span (if exists) or container
    const textEl = this.streakDisplay.querySelector('.streak-text');
    if (textEl) {
      textEl.textContent = `${count} HIT STREAK`;
    } else {
      this.streakDisplay.textContent = `${count} HIT STREAK`;
    }
    
    this.streakDisplay.className = '';
    this.streakDisplay.style.opacity = '1';

    // Determine tier based on streak
    let tierClass = 'impact-tier-1';
    if (count >= 10) tierClass = 'impact-tier-4';
    else if (count >= 7) tierClass = 'impact-tier-3';
    else if (count >= 5) tierClass = 'impact-tier-2';

    // Use requestAnimationFrame to restart animation without blocking
    requestAnimationFrame(() => {
      this.streakDisplay.classList.add('impact-text', tierClass);
      if (count >= 5) this.streakDisplay.classList.add('shake');
    });

    if (this.streakTimeout) clearTimeout(this.streakTimeout);
    this.streakTimeout = window.setTimeout(() => {
      this.streakDisplay.style.opacity = '0';
      this.streakDisplay.className = '';
    }, 2000);
  }

  public addKillFeed(killer: string, victim: string, weapon: string, isHeadshot: boolean, isMultiKill: boolean = false): void {
    this.killfeed.addKill(killer, victim, weapon, isHeadshot, isMultiKill);
  }

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

  public reset(): void {
    // Reset wave tracker so first wave animation shows
    this.currentWave = 0;
  }

  public updateScoreboard(scores: any, myUserId: string) {
    const tbody = document.getElementById('scoreboard-body');
    if (!tbody) return;

    tbody.innerHTML = ''; // Clear existing

    // Convert players object to array and sort by kills
    const players = Object.entries(scores.players).map(([id, stats]: [string, any]) => ({
      id,
      ...stats
    })).sort((a: any, b: any) => b.kills - a.kills);

    players.forEach((p: any) => {
      const tr = document.createElement('tr');
      if (p.id === myUserId) {
        tr.classList.add('local-player');
      }

      const name = p.id === myUserId ? 'YOU' : `Player ${p.id.substr(0, 4)}`;

      tr.innerHTML = `
                <td>${name}</td>
                <td>${p.kills}</td>
                <td>${p.deaths}</td>
                <td>${p.ping || 0}ms</td>
            `;
      tbody.appendChild(tr);
    });
  }

  public toggleScoreboard(visible: boolean) {
    const scoreboard = document.getElementById('scoreboard');
    if (scoreboard) {
      scoreboard.style.display = visible ? 'block' : 'none';
    }
  }

  public showWaitingForPlayers(show: boolean): void {
    let waitingEl = document.getElementById('waiting-message');
    if (!waitingEl) {
      waitingEl = document.createElement('div');
      waitingEl.id = 'waiting-message';
      waitingEl.style.position = 'absolute';
      waitingEl.style.top = '20%';
      waitingEl.style.left = '50%';
      waitingEl.style.transform = 'translate(-50%, -50%)';
      waitingEl.style.color = '#ffffff';
      waitingEl.style.fontFamily = "'Orbitron', sans-serif";
      waitingEl.style.fontSize = '24px';
      waitingEl.style.fontWeight = 'bold';
      waitingEl.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.5)';
      waitingEl.style.zIndex = '100';
      waitingEl.textContent = 'WAITING FOR PLAYERS...';
      document.body.appendChild(waitingEl);
    }
    waitingEl.style.display = show ? 'block' : 'none';
  }

  public showTeamScoreboard(show: boolean): void {
    let teamScoreEl = document.getElementById('team-scores');
    if (!teamScoreEl) {
      teamScoreEl = document.createElement('div');
      teamScoreEl.id = 'team-scores';
      teamScoreEl.style.position = 'absolute';
      teamScoreEl.style.top = '20px';
      teamScoreEl.style.left = '50%';
      teamScoreEl.style.transform = 'translateX(-50%)';
      teamScoreEl.style.display = 'flex';
      teamScoreEl.style.gap = '20px';
      teamScoreEl.style.fontFamily = "'Orbitron', sans-serif";
      teamScoreEl.style.fontSize = '32px';
      teamScoreEl.style.fontWeight = 'bold';
      teamScoreEl.style.zIndex = '90';
      teamScoreEl.innerHTML = `
        <div id="score-blue" style="color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">0</div>
        <div style="color: #fff;">-</div>
        <div id="score-red" style="color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">0</div>
      `;
      document.body.appendChild(teamScoreEl);
    }
    teamScoreEl.style.display = show ? 'flex' : 'none';
  }

  public updateTeamScores(red: number, blue: number): void {
    const redEl = document.getElementById('score-red');
    const blueEl = document.getElementById('score-blue');
    if (redEl) redEl.textContent = red.toString();
    if (blueEl) blueEl.textContent = blue.toString();
  }

  public showFlagStatus(redStatus: string, blueStatus: string): void {
    let flagStatusEl = document.getElementById('flag-status');
    if (!flagStatusEl) {
      flagStatusEl = document.createElement('div');
      flagStatusEl.id = 'flag-status';
      flagStatusEl.style.position = 'absolute';
      flagStatusEl.style.top = '60px';
      flagStatusEl.style.left = '50%';
      flagStatusEl.style.transform = 'translateX(-50%)';
      flagStatusEl.style.display = 'flex';
      flagStatusEl.style.gap = '40px';
      flagStatusEl.style.fontFamily = "'Orbitron', sans-serif";
      flagStatusEl.style.fontSize = '18px';
      flagStatusEl.style.fontWeight = 'bold';
      flagStatusEl.style.zIndex = '90';
      flagStatusEl.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
      document.body.appendChild(flagStatusEl);
    }

    const getStatusColor = (status: string) => {
      if (status === 'TAKEN') return '#ffaa00'; // Orange for danger
      if (status === 'DROPPED') return '#ffff00'; // Yellow for caution
      return '#ffffff'; // White for safe
    };

    flagStatusEl.innerHTML = `
      <div style="color: #ef4444; display: flex; align-items: center; gap: 10px;">
        <span>RED FLAG:</span>
        <span style="color: ${getStatusColor(redStatus)}">${redStatus}</span>
      </div>
      <div style="color: #3b82f6; display: flex; align-items: center; gap: 10px;">
        <span>BLUE FLAG:</span>
        <span style="color: ${getStatusColor(blueStatus)}">${blueStatus}</span>
      </div>
    `;
    flagStatusEl.style.display = 'flex';
  }

  public hideFlagStatus(): void {
    const el = document.getElementById('flag-status');
    if (el) el.style.display = 'none';
  }

  public updateZoneInfo(radius: number, timeToShrink: number): void {
    let zoneEl = document.getElementById('zone-info');
    if (!zoneEl) {
      zoneEl = document.createElement('div');
      zoneEl.id = 'zone-info';
      zoneEl.style.position = 'absolute';
      zoneEl.style.top = '100px';
      zoneEl.style.right = '20px';
      zoneEl.style.textAlign = 'right';
      zoneEl.style.fontFamily = "'Orbitron', sans-serif";
      zoneEl.style.color = '#fff';
      zoneEl.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
      document.body.appendChild(zoneEl);
    }

    const timeStr = timeToShrink > 0 ? `SHRINKING IN: ${Math.ceil(timeToShrink)}s` : 'ZONE SHRINKING!';
    const color = timeToShrink > 0 ? '#fff' : '#ef4444';

    zoneEl.innerHTML = `
          <div style="font-size: 18px; font-weight: bold; color: ${color}">${timeStr}</div>
          <div style="font-size: 14px; color: #aaa">ZONE RADIUS: ${Math.round(radius)}m</div>
      `;
    zoneEl.style.display = 'block';
  }

  public updateAliveCount(count: number): void {
    let aliveEl = document.getElementById('alive-count');
    if (!aliveEl) {
      aliveEl = document.createElement('div');
      aliveEl.id = 'alive-count';
      aliveEl.style.position = 'absolute';
      aliveEl.style.top = '20px';
      aliveEl.style.right = '20px';
      aliveEl.style.fontFamily = "'Orbitron', sans-serif";
      aliveEl.style.fontSize = '24px';
      aliveEl.style.fontWeight = 'bold';
      aliveEl.style.color = '#fff';
      aliveEl.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
      document.body.appendChild(aliveEl);
    }
    aliveEl.textContent = `ALIVE: ${count}`;
    aliveEl.style.display = 'block';
  }

  public showSpectatorUI(targetName: string): void {
    let specEl = document.getElementById('spectator-ui');
    if (!specEl) {
      specEl = document.createElement('div');
      specEl.id = 'spectator-ui';
      specEl.style.position = 'absolute';
      specEl.style.bottom = '100px';
      specEl.style.left = '50%';
      specEl.style.transform = 'translateX(-50%)';
      specEl.style.fontFamily = "'Orbitron', sans-serif";
      specEl.style.fontSize = '20px';
      specEl.style.fontWeight = 'bold';
      specEl.style.color = '#fbbf24'; // Amber
      specEl.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
      document.body.appendChild(specEl);
    }
    specEl.textContent = `SPECTATING: ${targetName}`;
    specEl.style.display = 'block';

    // Hide normal HUD elements
    this.hideHUD();
  }

  public updateMinimap(playerPos: { x: number, z: number }, mapSize: number, zoneRadius: number, zoneCenter: { x: number, z: number }, remotePlayers: Array<{ x: number, z: number, team?: string }>): void {
    let minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (!minimapCanvas) {
      const container = document.createElement('div');
      container.id = 'minimap-container';
      container.style.position = 'absolute';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.width = '200px';
      container.style.height = '200px';
      container.style.border = '2px solid #fff';
      container.style.borderRadius = '50%';
      container.style.overflow = 'hidden';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      document.body.appendChild(container);

      minimapCanvas = document.createElement('canvas');
      minimapCanvas.id = 'minimap-canvas';
      minimapCanvas.width = 200;
      minimapCanvas.height = 200;
      container.appendChild(minimapCanvas);
    }

    const ctx = minimapCanvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const center = size / 2;
    const scale = size / mapSize; // Map world units to pixels

    ctx.clearRect(0, 0, size, size);

    // Draw Zone
    ctx.beginPath();
    ctx.arc(
      center + zoneCenter.x * scale,
      center + zoneCenter.z * scale,
      zoneRadius * scale,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Remote Players (if visible/teammates)
    remotePlayers.forEach(p => {
      ctx.beginPath();
      ctx.arc(center + p.x * scale, center + p.z * scale, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.team === 'blue' ? '#3b82f6' : '#ef4444';
      ctx.fill();
    });

    // Draw Local Player
    ctx.beginPath();
    ctx.arc(center + playerPos.x * scale, center + playerPos.z * scale, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff00';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  public setupSettingsMenu(
    settingsManager: any,
    onBack: () => void,
    onChange?: () => void
  ): void {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const backBtn = document.getElementById('settings-back-btn');
    const pauseMenu = document.getElementById('pause-menu');

    const sensSlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    const sensValue = document.getElementById('sensitivity-value');
    const volSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volValue = document.getElementById('volume-value');
    const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
    const fovValue = document.getElementById('fov-value');

    if (settingsBtn && settingsMenu && backBtn && pauseMenu) {
      settingsBtn.addEventListener('click', () => {
        pauseMenu.style.display = 'none';
        settingsMenu.style.display = 'flex';

        // Load current values
        const current = settingsManager.getSettings();
        if (sensSlider && sensValue) {
          sensSlider.value = current.sensitivity.toString();
          sensValue.textContent = current.sensitivity.toFixed(4);
        }
        if (volSlider && volValue) {
          volSlider.value = current.volume.toString();
          volValue.textContent = `${Math.round(current.volume * 100)}%`;
        }
        if (fovSlider && fovValue) {
          fovSlider.value = current.fov.toString();
          fovValue.textContent = current.fov.toString();
        }
      });

      backBtn.addEventListener('click', () => {
        settingsMenu.style.display = 'none';
        pauseMenu.style.display = 'flex';
        onBack();
      });
    }

    // Bind sliders
    if (sensSlider && sensValue) {
      sensSlider.addEventListener('input', (e: any) => {
        const val = parseFloat(e.target.value);
        settingsManager.setSensitivity(val);
        sensValue.textContent = val.toFixed(4);
        if (onChange) onChange();
      });
    }

    if (volSlider && volValue) {
      volSlider.addEventListener('input', (e: any) => {
        const val = parseFloat(e.target.value);
        settingsManager.setVolume(val);
        volValue.textContent = `${Math.round(val * 100)}%`;
        if (onChange) onChange();
      });
    }

    if (fovSlider && fovValue) {
      fovSlider.addEventListener('input', (e: any) => {
        const val = parseInt(e.target.value);
        settingsManager.setFOV(val);
        fovValue.textContent = val.toString();
        if (onChange) onChange();
      });
    }
  }
  
  public show(): void {
    this.showHUD();
  }
  
  public hide(): void {
    this.hideHUD();
  }
  
  public updateKillfeed(_delta: number): void {
    // Logic to update killfeed animations if needed
  }
}
