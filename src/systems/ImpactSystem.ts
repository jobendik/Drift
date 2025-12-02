import * as THREE from 'three';

export enum SurfaceMaterial {
  BRICK = 'brick',
  WOOD = 'wood',
  METAL = 'metal',
  ROCK = 'rock',
  GRAVEL = 'gravel',
  DEFAULT = 'default'
}

interface ImpactAudioBuffers {
  bodyImpacts: AudioBuffer[];
  deathImpact?: AudioBuffer;
  hitImpact?: AudioBuffer;
  explosion?: AudioBuffer;
  bulletWhiz?: AudioBuffer;
  shellDrop?: AudioBuffer;
  surfaceImpacts: {
    [key in SurfaceMaterial]?: AudioBuffer[];
  };
}

export class ImpactSystem {
  private audioBuffers: ImpactAudioBuffers = {
    bodyImpacts: [],
    surfaceImpacts: {}
  };
  private audioListener: THREE.AudioListener;
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene, listener: THREE.AudioListener) {
    this.scene = scene;
    this.audioListener = listener;
    this.loadAudio();
  }

  private loadAudio(): void {
    const audioLoader = new THREE.AudioLoader();

    // Body impact sounds (randomized for variety)
    const bodyImpactPaths = [
      'assets/audio/impact/Body-Impact-1.mp3_ebcdfb87.mp3',
      'assets/audio/impact/Body-Impact-2.mp3_12d2c187.mp3',
      'assets/audio/impact/Body-Impact-3.mp3_18dfe9d0.mp3',
    ];

    bodyImpactPaths.forEach((path) => {
      audioLoader.load(path, (buffer) => {
        this.audioBuffers.bodyImpacts.push(buffer);
      }, undefined, (err) => console.warn(`Failed to load ${path}:`, err));
    });

    // Death impact
    audioLoader.load('assets/audio/impact/Death-Impact.mp3_c52d9a48.mp3', (buffer) => {
      this.audioBuffers.deathImpact = buffer;
    }, undefined, (err) => console.warn('Failed to load death impact:', err));

    // Hit confirmation
    audioLoader.load('assets/audio/impact/Hit-Impact.mp3_f966c566.mp3', (buffer) => {
      this.audioBuffers.hitImpact = buffer;
    }, undefined, (err) => console.warn('Failed to load hit impact:', err));

    // Explosion (Placeholder using Shotgun Fire pitched down)
    audioLoader.load('assets/audio/weapons/Shotgun-Fire.mp3_c4d738ce.mp3', (buffer) => {
      this.audioBuffers.explosion = buffer;
    }, undefined, (err) => console.warn('Failed to load explosion sound:', err));

    // Bullet Whiz (using a tail sound as placeholder)
    audioLoader.load('assets/audio/weapons/Tec-9-Tail.mp3_af6632ea.mp3', (buffer) => {
      this.audioBuffers.bulletWhiz = buffer;
    }, undefined, (err) => console.warn('Failed to load bullet whiz:', err));

    // Shell Drop (using light metal impact)
    audioLoader.load('assets/audio/impact/Impact-Iron-Light.mp3_98124b45.mp3', (buffer) => {
      this.audioBuffers.shellDrop = buffer;
    }, undefined, (err) => console.warn('Failed to load shell drop:', err));

    // Surface impacts - organized by material
    const surfaceImpacts = {
      [SurfaceMaterial.BRICK]: [
        'assets/audio/impact/Impact-Brick-1.mp3_a94b2f30.mp3',
        'assets/audio/impact/Impact-Brick-2.mp3_e5272b6e.mp3',
      ],
      [SurfaceMaterial.GRAVEL]: [
        'assets/audio/impact/Impact-Gravel-1.mp3_316a5b34.mp3',
        'assets/audio/impact/Impact-Gravel-2.mp3_f200f6f4.mp3',
      ],
      [SurfaceMaterial.WOOD]: [
        'assets/audio/impact/Impact-Wood-1.mp3_64342904.mp3',
        'assets/audio/impact/Impact-Wood-2.mp3_7d0358dc.mp3',
      ],
      [SurfaceMaterial.ROCK]: [
        'assets/audio/impact/Impact-Rock-1.mp3_3fb18a97.mp3',
        'assets/audio/impact/Impact-Rock-2.mp3_36f87391.mp3',
      ],
      [SurfaceMaterial.METAL]: [
        'assets/audio/impact/Impact-Metal.mp3_6914f782.mp3',
        'assets/audio/impact/Impact-Iron.mp3_9d87d712.mp3',
        'assets/audio/impact/Impact-Iron-Light.mp3_98124b45.mp3',
      ],
    };

    Object.entries(surfaceImpacts).forEach(([material, paths]) => {
      this.audioBuffers.surfaceImpacts[material as SurfaceMaterial] = [];
      paths.forEach((path) => {
        audioLoader.load(path, (buffer) => {
          this.audioBuffers.surfaceImpacts[material as SurfaceMaterial]!.push(buffer);
        }, undefined, (err) => console.warn(`Failed to load ${path}:`, err));
      });
    });
  }

  /**
   * Play body hit impact sound - randomized for variety
   * Volume is exaggerated for satisfying feedback
   */
  public playBodyImpact(position: THREE.Vector3, volume: number = 1.0): void {
    if (this.audioBuffers.bodyImpacts.length === 0) return;

    const sound = new THREE.PositionalAudio(this.audioListener);
    const randomBuffer = this.audioBuffers.bodyImpacts[
      Math.floor(Math.random() * this.audioBuffers.bodyImpacts.length)
    ];
    
    sound.setBuffer(randomBuffer);
    sound.setRefDistance(5);
    sound.setVolume(volume * 1.5); // Exaggerated for punchiness
    sound.setLoop(false);
    
    // Create temporary object for positional audio
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }

  /**
   * Play death impact - final, explosive sound
   */
  public playDeathImpact(position: THREE.Vector3): void {
    if (!this.audioBuffers.deathImpact) return;

    const sound = new THREE.PositionalAudio(this.audioListener);
    sound.setBuffer(this.audioBuffers.deathImpact);
    sound.setRefDistance(8);
    sound.setVolume(2.0); // Very loud and punchy
    sound.setLoop(false);
    
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }

  /**
   * Play hit confirmation sound - instant feedback, zero latency
   */
  public playHitConfirmation(volume: number = 0.8): void {
    if (!this.audioBuffers.hitImpact) return;

    const sound = new THREE.Audio(this.audioListener);
    sound.setBuffer(this.audioBuffers.hitImpact);
    sound.setVolume(volume * 1.2);
    sound.play();
  }

  /**
   * Play bullet whiz sound for near misses
   * High pitch, fast playback to simulate supersonic crack
   */
  public playBulletWhiz(position: THREE.Vector3): void {
    if (!this.audioBuffers.bulletWhiz) return;

    const sound = new THREE.PositionalAudio(this.audioListener);
    sound.setBuffer(this.audioBuffers.bulletWhiz);
    sound.setRefDistance(5);
    sound.setVolume(0.4);
    sound.setPlaybackRate(1.5 + Math.random() * 0.5); // Vary pitch
    sound.setLoop(false);
    
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }

  /**
   * Play shell casing drop sound
   * Tiny, metallic clink
   */
  public playShellDrop(position: THREE.Vector3): void {
    if (!this.audioBuffers.shellDrop) return;

    const sound = new THREE.PositionalAudio(this.audioListener);
    sound.setBuffer(this.audioBuffers.shellDrop);
    sound.setRefDistance(3);
    sound.setVolume(0.3);
    sound.setPlaybackRate(2.0 + Math.random() * 0.5); // High pitch for small object
    sound.setLoop(false);
    
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }

  /**
   * Play massive explosion sound
   */
  public playExplosion(position: THREE.Vector3): void {
    if (!this.audioBuffers.explosion) return;

    const sound = new THREE.PositionalAudio(this.audioListener);
    sound.setBuffer(this.audioBuffers.explosion);
    sound.setRefDistance(20); // Heard from far away
    sound.setVolume(2.0); // Very loud
    sound.setPlaybackRate(0.5); // Deep, bassy rumble
    sound.setLoop(false);
    
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }

  /**
   * Play surface impact based on material type
   * Different materials = distinct sonic signatures for instant clarity
   */
  public playSurfaceImpact(
    position: THREE.Vector3,
    material: SurfaceMaterial,
    volume: number = 0.8
  ): void {
    const buffers = this.audioBuffers.surfaceImpacts[material];
    if (!buffers || buffers.length === 0) {
      // Fallback to metal for default
      const fallback = this.audioBuffers.surfaceImpacts[SurfaceMaterial.METAL];
      if (!fallback || fallback.length === 0) return;
      this.playSurfaceImpactWithBuffer(position, fallback, volume);
      return;
    }

    this.playSurfaceImpactWithBuffer(position, buffers, volume);
  }

  private playSurfaceImpactWithBuffer(
    position: THREE.Vector3,
    buffers: AudioBuffer[],
    volume: number
  ): void {
    const sound = new THREE.PositionalAudio(this.audioListener);
    const randomBuffer = buffers[Math.floor(Math.random() * buffers.length)];
    
    sound.setBuffer(randomBuffer);
    sound.setRefDistance(10);
    sound.setVolume(volume * 1.3); // Punchy and exaggerated
    sound.setLoop(false);
    
    const temp = new THREE.Object3D();
    temp.position.copy(position);
    this.scene.add(temp);
    temp.add(sound);
    
    sound.play();
    sound.onEnded = () => {
      this.scene.remove(temp);
    };
  }
}
