import * as THREE from 'three';

interface TouchData {
  identifier: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  prevX: number;
  prevY: number;
  startTime: number;
  zone: 'move' | 'look' | 'button';
}

interface GyroscopeData {
  alpha: number;
  beta: number;
  gamma: number;
}

export class MobileControls {
  private container: HTMLElement;
  private joystickContainer: HTMLDivElement;
  private joystickStick: HTMLDivElement;
  private rightButtonContainer: HTMLDivElement;
  private leftButtonContainer: HTMLDivElement;
  
  // Touch tracking - STRICTLY ISOLATED
  private moveTouch: TouchData | null = null;
  private lookTouch: TouchData | null = null;
  private activeTouches: Map<number, TouchData> = new Map();
  
  // Public inputs
  public movementInput = new THREE.Vector2(0, 0);
  public lookDelta = new THREE.Vector2(0, 0);
  public firePressed = false;
  public jumpPressed = false;
  public reloadPressed = false;
  public weaponSwitchRequested = 0;
  
  // PROPERLY TUNED SETTINGS for FPS gameplay
  private joystickMaxDistance = 50;
  private lookSensitivity = 0.15; // Optimized for precise aiming
  private lookDeadzone = 1; // Tiny deadzone to filter micro-jitter
  private lookSmoothing = 0.35; // Light smoothing for polish
  
  // Smoothed look input
  private smoothedLookDelta = new THREE.Vector2(0, 0);
  
  private gyroEnabled = false;
  private gyroSensitivity = 0.02;
  private hapticEnabled = true;
  
  // Gyroscope
  private gyroData: GyroscopeData | null = null;
  private gyroBaseline: GyroscopeData | null = null;
  
  // Debug mode
  private debugMode = false;
  
  // Failsafe timer
  private touchCleanupInterval: number | null = null;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'mobile-controls';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      display: none;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    `;
    
    // Create joystick
    this.joystickContainer = this.createJoystick();
    this.container.appendChild(this.joystickContainer);
    
    // Get joystick stick element
    this.joystickStick = this.joystickContainer.querySelector('.joystick-stick') as HTMLDivElement;
    
    // Create left side buttons
    this.leftButtonContainer = this.createLeftButtons();
    this.container.appendChild(this.leftButtonContainer);
    
    // Create right side buttons
    this.rightButtonContainer = this.createRightButtons();
    this.container.appendChild(this.rightButtonContainer);
    
    document.body.appendChild(this.container);
    
    this.setupEventListeners();
    this.initGyroscope();
    this.startTouchCleanupWatchdog();
  }
  
  private createJoystick(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 40px;
      width: 150px;
      height: 150px;
      pointer-events: auto;
      touch-action: none;
      z-index: 100;
    `;
    
    const base = document.createElement('div');
    base.className = 'joystick-base';
    base.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.2);
    `;
    
    const stick = document.createElement('div');
    stick.className = 'joystick-stick';
    stick.style.cssText = `
      position: absolute;
      width: 60px;
      height: 60px;
      background: radial-gradient(circle, rgba(0, 255, 255, 0.7), rgba(0, 255, 255, 0.3));
      border: 3px solid rgba(0, 255, 255, 0.9);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease-out;
      box-shadow: 
        0 0 20px rgba(0, 255, 255, 0.6),
        inset 0 0 10px rgba(255, 255, 255, 0.3);
      pointer-events: none;
    `;
    
    container.appendChild(base);
    container.appendChild(stick);
    
    return container;
  }
  
  private createLeftButtons(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 210px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      pointer-events: auto;
      touch-action: none;
      z-index: 100;
    `;
    
    // Jump button
    const jumpBtn = this.createButton('JUMP', '65px', 'rgba(100, 255, 100, 0.3)', 'rgba(100, 255, 100, 0.6)');
    jumpBtn.addEventListener('touchstart', (e) => this.handleButtonTouchStart(e, 'jump'), { passive: false });
    jumpBtn.addEventListener('touchend', (e) => this.handleButtonTouchEnd(e, 'jump'), { passive: false });
    jumpBtn.addEventListener('touchcancel', (e) => this.handleButtonTouchEnd(e, 'jump'), { passive: false });
    
    // Reload button
    const reloadBtn = this.createButton('R', '65px', 'rgba(255, 200, 100, 0.3)', 'rgba(255, 200, 100, 0.6)');
    reloadBtn.addEventListener('touchstart', (e) => this.handleButtonTouchStart(e, 'reload'), { passive: false });
    reloadBtn.addEventListener('touchend', (e) => this.handleButtonTouchEnd(e, 'reload'), { passive: false });
    reloadBtn.addEventListener('touchcancel', (e) => this.handleButtonTouchEnd(e, 'reload'), { passive: false });
    
    container.appendChild(jumpBtn);
    container.appendChild(reloadBtn);
    
    return container;
  }
  
  private createRightButtons(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      bottom: 40px;
      right: 40px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-end;
      pointer-events: auto;
      touch-action: none;
      z-index: 100;
    `;
    
    // Weapon switch buttons
    const weaponContainer = document.createElement('div');
    weaponContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const nextWeaponBtn = this.createButton('▲', '50px', 'rgba(200, 100, 255, 0.3)', 'rgba(200, 100, 255, 0.6)');
    nextWeaponBtn.style.fontSize = '18px';
    nextWeaponBtn.addEventListener('touchstart', (e) => this.handleButtonTouchStart(e, 'nextWeapon'), { passive: false });
    nextWeaponBtn.addEventListener('touchend', (e) => this.handleButtonTouchEnd(e, 'nextWeapon'), { passive: false });
    nextWeaponBtn.addEventListener('touchcancel', (e) => this.handleButtonTouchEnd(e, 'nextWeapon'), { passive: false });
    
    const prevWeaponBtn = this.createButton('▼', '50px', 'rgba(200, 100, 255, 0.3)', 'rgba(200, 100, 255, 0.6)');
    prevWeaponBtn.style.fontSize = '18px';
    prevWeaponBtn.addEventListener('touchstart', (e) => this.handleButtonTouchStart(e, 'prevWeapon'), { passive: false });
    prevWeaponBtn.addEventListener('touchend', (e) => this.handleButtonTouchEnd(e, 'prevWeapon'), { passive: false });
    prevWeaponBtn.addEventListener('touchcancel', (e) => this.handleButtonTouchEnd(e, 'prevWeapon'), { passive: false });
    
    weaponContainer.appendChild(nextWeaponBtn);
    weaponContainer.appendChild(prevWeaponBtn);
    
    // FIRE BUTTON
    const fireBtn = this.createButton('FIRE', '80px', 'rgba(255, 50, 50, 0.3)', 'rgba(255, 50, 50, 0.7)');
    fireBtn.style.fontSize = '16px';
    fireBtn.style.fontWeight = 'bold';
    fireBtn.addEventListener('touchstart', (e) => this.handleButtonTouchStart(e, 'fire'), { passive: false });
    fireBtn.addEventListener('touchmove', (e) => this.handleFireButtonMove(e), { passive: false });
    fireBtn.addEventListener('touchend', (e) => this.handleButtonTouchEnd(e, 'fire'), { passive: false });
    fireBtn.addEventListener('touchcancel', (e) => this.handleButtonTouchEnd(e, 'fire'), { passive: false });
    
    container.appendChild(weaponContainer);
    container.appendChild(fireBtn);
    
    return container;
  }
  
  private createButton(text: string, size: string, bgColor: string, activeColor: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: ${size};
      height: ${size};
      background: ${bgColor};
      border: 3px solid ${activeColor};
      border-radius: 50%;
      color: white;
      font-weight: bold;
      font-size: 14px;
      backdrop-filter: blur(10px);
      cursor: pointer;
      box-shadow: 0 0 20px ${activeColor.replace('0.6', '0.4').replace('0.7', '0.4')};
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: all 0.1s ease;
      pointer-events: auto;
    `;
    
    return btn;
  }
  
  private handleButtonTouchStart(e: TouchEvent, action: string): void {
    e.preventDefault();
    e.stopPropagation();
    
    // CRITICAL: Use changedTouches to get the NEW touch
    const touch = e.changedTouches[0];
    const target = e.currentTarget as HTMLButtonElement;
    
    // Visual feedback
    const activeColor = action === 'fire' ? 'rgba(255, 50, 50, 0.7)' :
                       action === 'jump' ? 'rgba(100, 255, 100, 0.6)' :
                       action === 'reload' ? 'rgba(255, 200, 100, 0.6)' :
                       'rgba(200, 100, 255, 0.6)';
    
    target.style.background = activeColor;
    target.style.transform = 'scale(0.92)';
    target.style.boxShadow = `0 0 30px ${activeColor}`;
    
    // Track this touch
    this.activeTouches.set(touch.identifier, {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      prevX: touch.clientX,
      prevY: touch.clientY,
      startTime: Date.now(),
      zone: 'button'
    });
    
    // Handle action - SIMPLE AND DIRECT
    switch (action) {
      case 'fire':
        this.firePressed = true;
        this.triggerHaptic('light');
        break;
      case 'jump':
        this.jumpPressed = true;
        this.triggerHaptic('light');
        break;
      case 'reload':
        this.reloadPressed = true;
        this.triggerHaptic('medium');
        setTimeout(() => this.reloadPressed = false, 100);
        break;
      case 'nextWeapon':
        this.weaponSwitchRequested = 1;
        this.triggerHaptic('medium');
        break;
      case 'prevWeapon':
        this.weaponSwitchRequested = -1;
        this.triggerHaptic('medium');
        break;
    }
  }
  
  private handleButtonTouchEnd(e: TouchEvent, action: string): void {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.changedTouches[0];
    const target = e.currentTarget as HTMLButtonElement;
    
    // Visual feedback
    const bgColor = action === 'fire' ? 'rgba(255, 50, 50, 0.3)' :
                   action === 'jump' ? 'rgba(100, 255, 100, 0.3)' :
                   action === 'reload' ? 'rgba(255, 200, 100, 0.3)' :
                   'rgba(200, 100, 255, 0.3)';
    const activeColor = action === 'fire' ? 'rgba(255, 50, 50, 0.7)' :
                       action === 'jump' ? 'rgba(100, 255, 100, 0.6)' :
                       action === 'reload' ? 'rgba(255, 200, 100, 0.6)' :
                       'rgba(200, 100, 255, 0.6)';
    
    target.style.background = bgColor;
    target.style.transform = 'scale(1)';
    target.style.boxShadow = `0 0 20px ${activeColor.replace('0.6', '0.4').replace('0.7', '0.4')}`;
    
    // Clean up touch
    this.activeTouches.delete(touch.identifier);
    
    // Handle action - SIMPLE AND DIRECT
    switch (action) {
      case 'fire':
        this.firePressed = false;
        break;
      case 'jump':
        this.jumpPressed = false;
        break;
    }
  }
  
  // FIRE BUTTON DRAG = AIM WHILE FIRING
  private handleFireButtonMove(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const touchData = this.activeTouches.get(touch.identifier);
    
    if (!touchData) return;
    
    // Calculate delta from last position
    const rawDeltaX = touch.clientX - touchData.currentX;
    const rawDeltaY = touch.clientY - touchData.currentY;
    
    // Apply deadzone
    const deltaX = Math.abs(rawDeltaX) > this.lookDeadzone ? rawDeltaX : 0;
    const deltaY = Math.abs(rawDeltaY) > this.lookDeadzone ? rawDeltaY : 0;
    
    // Apply sensitivity
    const targetX = deltaX * this.lookSensitivity;
    const targetY = deltaY * this.lookSensitivity;
    
    // Smooth the input
    this.smoothedLookDelta.x += (targetX - this.smoothedLookDelta.x) * this.lookSmoothing;
    this.smoothedLookDelta.y += (targetY - this.smoothedLookDelta.y) * this.lookSmoothing;
    
    // Set the final look delta
    this.lookDelta.copy(this.smoothedLookDelta);
    
    // Update touch position
    touchData.prevX = touchData.currentX;
    touchData.prevY = touchData.currentY;
    touchData.currentX = touch.clientX;
    touchData.currentY = touch.clientY;
  }
  
  private setupEventListeners(): void {
    // JOYSTICK - Completely isolated
    this.joystickContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleJoystickStart(e);
    }, { passive: false });
    
    this.joystickContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleJoystickMove(e);
    }, { passive: false });
    
    this.joystickContainer.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleJoystickEnd(e);
    }, { passive: false });
    
    this.joystickContainer.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleJoystickEnd(e);
    }, { passive: false });
    
    // DOCUMENT-LEVEL - For look area
    document.addEventListener('touchstart', (e) => this.handleLookTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleLookTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleLookTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this.handleLookTouchEnd(e), { passive: false });
  }
  
  // ==================== JOYSTICK ====================
  
  private handleJoystickStart(e: TouchEvent): void {
    // CRITICAL: Use changedTouches to get the NEW touch that just started
    // e.touches[0] would give us the FIRST touch (might be the look touch!)
    const touch = e.changedTouches[0];
    
    // Force cleanup
    if (this.moveTouch) {
      this.activeTouches.delete(this.moveTouch.identifier);
      this.moveTouch = null;
      this.movementInput.set(0, 0);
      this.resetJoystick();
    }
    
    this.moveTouch = {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      prevX: touch.clientX,
      prevY: touch.clientY,
      startTime: Date.now(),
      zone: 'move'
    };
    
    this.activeTouches.set(touch.identifier, this.moveTouch);
    this.updateJoystick();
  }
  
  private handleJoystickMove(e: TouchEvent): void {
    if (!this.moveTouch) return;
    
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === this.moveTouch.identifier) {
        this.moveTouch.prevX = this.moveTouch.currentX;
        this.moveTouch.prevY = this.moveTouch.currentY;
        this.moveTouch.currentX = touch.clientX;
        this.moveTouch.currentY = touch.clientY;
        this.updateJoystick();
        return;
      }
    }
    
    // Touch lost
    if (this.debugMode) {
      console.warn('Joystick touch lost - cleanup');
    }
    this.forceCleanupMoveTouch();
  }
  
  private handleJoystickEnd(e: TouchEvent): void {
    if (!this.moveTouch) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.moveTouch.identifier) {
        this.forceCleanupMoveTouch();
        return;
      }
    }
  }
  
  private forceCleanupMoveTouch(): void {
    if (this.moveTouch) {
      this.activeTouches.delete(this.moveTouch.identifier);
      this.moveTouch = null;
    }
    this.movementInput.set(0, 0);
    this.resetJoystick();
  }
  
  private updateJoystick(): void {
    if (!this.moveTouch) return;
    
    const deltaX = this.moveTouch.currentX - this.moveTouch.startX;
    const deltaY = this.moveTouch.currentY - this.moveTouch.startY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, this.joystickMaxDistance);
    
    const angle = Math.atan2(deltaY, deltaX);
    
    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;
    
    // Update visual
    this.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    
    const intensity = clampedDistance / this.joystickMaxDistance;
    this.joystickStick.style.boxShadow = `
      0 0 ${20 + intensity * 20}px rgba(0, 255, 255, ${0.6 + intensity * 0.4}),
      inset 0 0 10px rgba(255, 255, 255, 0.3)
    `;
    
    // Set input
    const normalizedX = stickX / this.joystickMaxDistance;
    const normalizedY = stickY / this.joystickMaxDistance;
    
    this.movementInput.set(normalizedX, -normalizedY);
  }
  
  private resetJoystick(): void {
    this.joystickStick.style.transform = 'translate(-50%, -50%)';
    this.joystickStick.style.boxShadow = `
      0 0 20px rgba(0, 255, 255, 0.6),
      inset 0 0 10px rgba(255, 255, 255, 0.3)
    `;
  }
  
  // ==================== LOOK/CAMERA - SIMPLIFIED ====================
  
  private handleLookTouchStart(e: TouchEvent): void {
    // CRITICAL: Use changedTouches to get the NEW touch that just started
    const touch = e.changedTouches[0];
    
    // Skip if already tracked
    if (this.activeTouches.has(touch.identifier)) {
      return;
    }
    
    // EXPANDED LOOK ZONE - Anywhere right of screen center
    const screenCenterX = window.innerWidth * 0.5;
    const isRightOfCenter = touch.clientX > screenCenterX;
    
    // Only exclude the very bottom button strip (weapon switch buttons)
    const buttonStripHeight = 150; // Bottom 150px reserved for buttons
    const isNotInButtonStrip = touch.clientY < window.innerHeight - buttonStripHeight;
    
    // Check if touch is in the expanded look zone
    if (!isRightOfCenter || !isNotInButtonStrip) {
      return;
    }
    
    e.preventDefault();
    
    // Force cleanup of any existing look touch
    if (this.lookTouch) {
      this.activeTouches.delete(this.lookTouch.identifier);
      this.lookTouch = null;
    }
    
    // Create new look touch
    this.lookTouch = {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      prevX: touch.clientX,
      prevY: touch.clientY,
      startTime: Date.now(),
      zone: 'look'
    };
    
    this.activeTouches.set(touch.identifier, this.lookTouch);
    this.showLookZone();
  }
  
  private handleLookTouchMove(e: TouchEvent): void {
    if (!this.lookTouch) return;
    
    e.preventDefault();
    
    let foundTouch = false;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === this.lookTouch.identifier) {
        foundTouch = true;
        
        // Calculate frame-to-frame delta
        const rawDeltaX = touch.clientX - this.lookTouch.currentX;
        const rawDeltaY = touch.clientY - this.lookTouch.currentY;
        
        // Apply deadzone to filter micro-movements
        const deltaX = Math.abs(rawDeltaX) > this.lookDeadzone ? rawDeltaX : 0;
        const deltaY = Math.abs(rawDeltaY) > this.lookDeadzone ? rawDeltaY : 0;
        
        // Apply sensitivity
        const targetX = deltaX * this.lookSensitivity;
        const targetY = deltaY * this.lookSensitivity;
        
        // Smooth the input for polish (lerp towards target)
        this.smoothedLookDelta.x += (targetX - this.smoothedLookDelta.x) * this.lookSmoothing;
        this.smoothedLookDelta.y += (targetY - this.smoothedLookDelta.y) * this.lookSmoothing;
        
        // Set the final look delta
        this.lookDelta.copy(this.smoothedLookDelta);
        
        // Update position for next frame
        this.lookTouch.prevX = this.lookTouch.currentX;
        this.lookTouch.prevY = this.lookTouch.currentY;
        this.lookTouch.currentX = touch.clientX;
        this.lookTouch.currentY = touch.clientY;
        break;
      }
    }
    
    if (!foundTouch) {
      if (this.debugMode) {
        console.warn('Look touch lost - cleanup');
      }
      this.forceCleanupLookTouch();
    }
  }
  
  private handleLookTouchEnd(e: TouchEvent): void {
    if (!this.lookTouch) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.lookTouch.identifier) {
        this.forceCleanupLookTouch();
        return;
      }
    }
  }
  
  private forceCleanupLookTouch(): void {
    if (this.lookTouch) {
      this.activeTouches.delete(this.lookTouch.identifier);
      this.lookTouch = null;
    }
    this.lookDelta.set(0, 0);
    this.smoothedLookDelta.set(0, 0);
    this.hideLookZone();
  }
  
  // ==================== WATCHDOG ====================
  
  private startTouchCleanupWatchdog(): void {
    this.touchCleanupInterval = window.setInterval(() => {
      if (this.moveTouch) {
        const touchData = this.activeTouches.get(this.moveTouch.identifier);
        if (!touchData || touchData.zone !== 'move') {
          if (this.debugMode) {
            console.warn('WATCHDOG: Stuck move touch - cleanup');
          }
          this.forceCleanupMoveTouch();
        }
      }
      
      if (this.lookTouch) {
        const touchData = this.activeTouches.get(this.lookTouch.identifier);
        if (!touchData || touchData.zone !== 'look') {
          if (this.debugMode) {
            console.warn('WATCHDOG: Stuck look touch - cleanup');
          }
          this.forceCleanupLookTouch();
        }
      }
    }, 500);
  }
  
  private stopTouchCleanupWatchdog(): void {
    if (this.touchCleanupInterval) {
      clearInterval(this.touchCleanupInterval);
      this.touchCleanupInterval = null;
    }
  }
  
  // ==================== VISUAL ====================
  
  private showLookZone(): void {
    // Overlay is invisible, nothing to show
  }
  
  private hideLookZone(): void {
    // Overlay is invisible, nothing to hide
  }
  
  // ==================== GYROSCOPE ====================
  
  private initGyroscope(): void {
    if (window.DeviceOrientationEvent) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('Gyroscope available but requires permission');
      } else {
        this.setupGyroscope();
      }
    }
  }
  
  private setupGyroscope(): void {
    window.addEventListener('deviceorientation', (e) => {
      if (!this.gyroEnabled) return;
      
      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        const current = {
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma
        };
        
        if (!this.gyroBaseline) {
          this.gyroBaseline = current;
        }
        
        this.gyroData = current;
      }
    });
  }
  
  public async requestGyroscopePermission(): Promise<boolean> {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          this.setupGyroscope();
          return true;
        }
      } catch (e) {
        console.error('Gyroscope permission denied', e);
      }
    }
    return false;
  }
  
  public setGyroEnabled(enabled: boolean): void {
    this.gyroEnabled = enabled;
    if (enabled && !this.gyroBaseline) {
      this.gyroBaseline = this.gyroData;
    }
  }
  
  public resetGyroBaseline(): void {
    this.gyroBaseline = this.gyroData;
  }
  
  private updateGyroscope(): void {
    if (!this.gyroEnabled || !this.gyroData || !this.gyroBaseline) return;
    
    const deltaGamma = (this.gyroData.gamma - this.gyroBaseline.gamma) * this.gyroSensitivity;
    const deltaBeta = (this.gyroData.beta - this.gyroBaseline.beta) * this.gyroSensitivity;
    
    this.lookDelta.x += deltaGamma * 0.5;
    this.lookDelta.y += deltaBeta * 0.5;
  }
  
  // ==================== HAPTICS ====================
  
  private triggerHaptic(intensity: 'light' | 'medium' | 'heavy'): void {
    if (!this.hapticEnabled || !navigator.vibrate) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50
    };
    
    navigator.vibrate(patterns[intensity]);
  }
  
  public triggerHitHaptic(): void {
    this.triggerHaptic('heavy');
  }
  
  public triggerKillHaptic(): void {
    if (!this.hapticEnabled || !navigator.vibrate) return;
    navigator.vibrate([30, 30, 30]);
  }
  
  // ==================== PUBLIC API ====================
  
  public show(): void {
    this.container.style.display = 'block';
  }
  
  public hide(): void {
    this.container.style.display = 'none';
  }
  
  public update(): void {
    // Update gyroscope
    if (this.gyroEnabled) {
      this.updateGyroscope();
    }
    
    // FAST DECAY - Camera stops quickly when finger stops
    // This is critical for precise aiming in FPS games
    this.lookDelta.multiplyScalar(0.3);
    this.smoothedLookDelta.multiplyScalar(0.4);
  }
  
  public setLookSensitivity(value: number): void {
    this.lookSensitivity = Math.max(0.05, Math.min(0.5, value));
  }
  
  public setLookSmoothing(value: number): void {
    this.lookSmoothing = Math.max(0.1, Math.min(0.8, value));
  }
  
  public setLookDeadzone(pixels: number): void {
    this.lookDeadzone = Math.max(0, Math.min(5, pixels));
  }
  
  public setHapticEnabled(enabled: boolean): void {
    this.hapticEnabled = enabled;
  }
  
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
  
  // Getters
  public getLookSensitivity(): number { return this.lookSensitivity; }
  public getLookSmoothing(): number { return this.lookSmoothing; }
  public getLookDeadzone(): number { return this.lookDeadzone; }
  public isHapticEnabled(): boolean { return this.hapticEnabled; }
  public isGyroEnabled(): boolean { return this.gyroEnabled; }
  
  public dispose(): void {
    this.stopTouchCleanupWatchdog();
    this.container.remove();
  }
  
  public static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }
}
