import * as THREE from 'three';

interface DamageNumber {
  element: HTMLElement;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class DamageTextSystem {
  private container: HTMLElement;
  private pool: DamageNumber[] = [];
  private activeNumbers: DamageNumber[] = [];
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.container = document.createElement('div');
    this.container.id = 'damage-text-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.zIndex = '100'; // Ensure it's above other things but below HUD if needed
    document.body.appendChild(this.container);
    
    // Pre-populate pool
    for (let i = 0; i < 50; i++) {
      this.createPoolItem();
    }
  }

  private createPoolItem(): DamageNumber {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.fontWeight = 'bold';
    el.style.fontFamily = "'Orbitron', sans-serif";
    el.style.textShadow = '0 0 2px black';
    el.style.display = 'none';
    el.style.willChange = 'transform, opacity';
    el.style.userSelect = 'none';
    this.container.appendChild(el);
    
    const item: DamageNumber = {
      element: el,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1.0,
      active: false
    };
    this.pool.push(item);
    return item;
  }

  public spawn(position: THREE.Vector3, amount: number, isCritical: boolean): void {
    let item = this.pool.find(p => !p.active);
    if (!item) {
      item = this.createPoolItem();
    }

    item.active = true;
    item.position.copy(position);
    // Randomize velocity slightly
    item.velocity.set(
      (Math.random() - 0.5) * 1.0,
      1.5 + Math.random() * 1.0,
      (Math.random() - 0.5) * 1.0
    );
    item.life = 0;
    item.maxLife = 0.8; // Short life

    item.element.textContent = Math.floor(amount).toString();
    item.element.style.display = 'block';
    item.element.style.color = isCritical ? '#ff3333' : '#ffffff';
    item.element.style.fontSize = isCritical ? '32px' : '24px';
    item.element.style.opacity = '1';
    item.element.style.textShadow = isCritical ? '0 0 10px #ff0000' : '0 0 2px black';
    
    this.activeNumbers.push(item);
  }

  public update(delta: number): void {
    for (let i = this.activeNumbers.length - 1; i >= 0; i--) {
      const item = this.activeNumbers[i];
      
      item.life += delta;
      if (item.life >= item.maxLife) {
        item.active = false;
        item.element.style.display = 'none';
        this.activeNumbers.splice(i, 1);
        continue;
      }

      // Update physics
      item.position.add(item.velocity.clone().multiplyScalar(delta));
      item.velocity.y -= 3.0 * delta; // Gravity

      // Project to screen
      const screenPos = item.position.clone().project(this.camera);
      
      // Check if in front of camera
      if (screenPos.z > 1 || Math.abs(screenPos.x) > 1.1 || Math.abs(screenPos.y) > 1.1) {
          item.element.style.display = 'none';
          // Don't remove, just hide, wait for life to expire
      } else {
          item.element.style.display = 'block';
          const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

          item.element.style.transform = `translate(${x}px, ${y}px)`;
          item.element.style.opacity = (1 - (item.life / item.maxLife)).toString();
      }
    }
  }
}
