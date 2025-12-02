// RIFT Integration - Remote Player Entity
// Represents other players in multiplayer

import * as THREE from 'three';
import { NetworkPlayerState } from './types';

/**
 * Remote Player - Represents another player in the game
 * Handles interpolation and rendering of other players
 */
export class RemotePlayer {
  public id: string;
  public username: string;
  public team: string = '';
  public isDead: boolean = false;

  private mesh: THREE.Group;
  private scene: THREE.Scene;

  // Interpolation
  private targetPosition: THREE.Vector3;
  private targetRotation: THREE.Euler;
  private currentPosition: THREE.Vector3;

  // State buffer for interpolation
  private stateBuffer: NetworkPlayerState[] = [];
  private interpolationDelay: number = 100; // ms

  // Visual components
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private nameLabelSprite: THREE.Sprite | null = null;

  constructor(scene: THREE.Scene, id: string, username?: string) {
    this.scene = scene;
    this.id = id;
    this.username = username || `Player_${id.slice(0, 4)}`;

    // Initialize positions
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.targetRotation = new THREE.Euler();

    // Create mesh
    this.mesh = new THREE.Group();
    this.mesh.name = `RemotePlayer_${id}`;

    // Create body (simple capsule placeholder)
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.9;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.mesh.add(this.bodyMesh);

    // Create head
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffcc99,
      roughness: 0.6,
    });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.y = 1.7;
    this.headMesh.castShadow = true;
    this.mesh.add(this.headMesh);

    // Create name label
    this.createNameLabel();

    // Add to scene
    this.scene.add(this.mesh);
  }

  /**
   * Create floating name label above player
   */
  private createNameLabel(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.username, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: false,
    });

    this.nameLabelSprite = new THREE.Sprite(spriteMaterial);
    this.nameLabelSprite.position.y = 2.2;
    this.nameLabelSprite.scale.set(1.5, 0.4, 1);
    this.mesh.add(this.nameLabelSprite);
  }

  /**
   * Update player state from network
   */
  public updateState(
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number },
    _isSprinting: boolean,
    _isGrounded: boolean
  ): void {
    // Add to state buffer for interpolation
    this.stateBuffer.push({
      userId: this.id,
      position,
      rotation,
      isSprinting: _isSprinting,
      isGrounded: _isGrounded,
      timestamp: Date.now(),
    });

    // Keep buffer size manageable
    while (this.stateBuffer.length > 10) {
      this.stateBuffer.shift();
    }
  }

  /**
   * Update mesh each frame (interpolation)
   */
  public update(delta: number): void {
    if (this.isDead) return;

    // Find states to interpolate between
    const renderTime = Date.now() - this.interpolationDelay;
    
    // Find two states to interpolate between
    let state1: NetworkPlayerState | null = null;
    let state2: NetworkPlayerState | null = null;

    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= renderTime && 
          this.stateBuffer[i + 1].timestamp >= renderTime) {
        state1 = this.stateBuffer[i];
        state2 = this.stateBuffer[i + 1];
        break;
      }
    }

    if (state1 && state2) {
      // Interpolate between states
      const timeDiff = state2.timestamp - state1.timestamp;
      const t = timeDiff > 0 ? (renderTime - state1.timestamp) / timeDiff : 0;

      // Position interpolation
      this.targetPosition.set(
        state1.position.x + (state2.position.x - state1.position.x) * t,
        state1.position.y + (state2.position.y - state1.position.y) * t,
        state1.position.z + (state2.position.z - state1.position.z) * t
      );

      // Rotation interpolation
      this.targetRotation.set(
        state1.rotation.x + (state2.rotation.x - state1.rotation.x) * t,
        state1.rotation.y + (state2.rotation.y - state1.rotation.y) * t,
        0
      );
    } else if (this.stateBuffer.length > 0) {
      // Use latest state if no interpolation possible
      const latest = this.stateBuffer[this.stateBuffer.length - 1];
      this.targetPosition.set(latest.position.x, latest.position.y, latest.position.z);
      this.targetRotation.set(latest.rotation.x, latest.rotation.y, 0);
    }

    // Smooth movement
    const smoothing = 1 - Math.pow(0.001, delta);
    this.currentPosition.lerp(this.targetPosition, smoothing);
    
    // Apply to mesh
    this.mesh.position.copy(this.currentPosition);
    this.mesh.rotation.y = this.targetRotation.y;
    
    // Rotate head for look direction
    this.headMesh.rotation.x = this.targetRotation.x;

    // Make name label face camera (billboard effect)
    if (this.nameLabelSprite) {
      // Name label will automatically face camera due to sprite behavior
    }
  }

  /**
   * Set team and update colors
   */
  public setTeam(team: string): void {
    this.team = team;
    
    // Update body color based on team
    const material = this.bodyMesh.material as THREE.MeshStandardMaterial;
    if (team === 'red') {
      material.color.setHex(0xff4444);
    } else if (team === 'blue') {
      material.color.setHex(0x4444ff);
    } else {
      material.color.setHex(0x00ff00);
    }
  }

  /**
   * Get the mesh group
   */
  public getMesh(): THREE.Group {
    return this.mesh;
  }

  /**
   * Get position
   */
  public getPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  /**
   * Play death animation
   */
  public die(): void {
    this.isDead = true;
    
    // Simple death effect - fall over
    const duration = 500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.mesh.rotation.z = Math.PI / 2 * progress;
      this.mesh.position.y = 0.5 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Respawn player
   */
  public respawn(position?: THREE.Vector3): void {
    this.isDead = false;
    this.mesh.rotation.z = 0;
    this.stateBuffer = [];

    if (position) {
      this.currentPosition.copy(position);
      this.targetPosition.copy(position);
      this.mesh.position.copy(position);
    }
  }

  /**
   * Clean up and remove from scene
   */
  public destroy(): void {
    this.scene.remove(this.mesh);
    
    // Dispose geometries and materials
    this.bodyMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    this.headMesh.geometry.dispose();
    (this.headMesh.material as THREE.Material).dispose();
    
    if (this.nameLabelSprite) {
      (this.nameLabelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.nameLabelSprite.material as THREE.Material).dispose();
    }
  }
}
