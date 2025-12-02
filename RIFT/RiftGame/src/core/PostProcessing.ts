import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private chromaPass: ShaderPass;
  private vignettePass: ShaderPass;
  private colorGradingPass: ShaderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.7,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    // Chromatic Aberration
    this.chromaPass = new ShaderPass(this.createChromaticAberrationShader());
    this.composer.addPass(this.chromaPass);

    // Vignette
    this.vignettePass = new ShaderPass(this.createVignetteShader());
    this.composer.addPass(this.vignettePass);

    // Color Grading (Brightness/Contrast/Saturation)
    this.colorGradingPass = new ShaderPass(this.createColorGradingShader());
    this.composer.addPass(this.colorGradingPass);
  }

  private createChromaticAberrationShader(): any {
    return {
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0.0 },
        angle: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        uniform float angle;
        varying vec2 vUv;
        
        void main() {
          vec2 offset = amount * vec2(cos(angle), sin(angle));
          vec4 cr = texture2D(tDiffuse, vUv + offset);
          vec4 cga = texture2D(tDiffuse, vUv);
          vec4 cb = texture2D(tDiffuse, vUv - offset);
          gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
        }
      `,
    };
  }

  private createVignetteShader(): any {
    return {
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 1.5 },
        offset: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
          gl_FragColor = vec4(mix(texel.rgb, vec3(0.0), dot(uv, uv) * darkness), texel.a);
        }
      `,
    };
  }

  private createColorGradingShader(): any {
    return {
      uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 1.1 },
        contrast: { value: 1.1 },
        saturation: { value: 1.2 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        uniform float contrast;
        uniform float saturation;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 color = texel.rgb;
          
          // Brightness
          color *= brightness;
          
          // Contrast
          color = (color - 0.5) * contrast + 0.5;
          
          // Saturation
          vec3 gray = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
          color = mix(gray, color, saturation);
          
          gl_FragColor = vec4(color, texel.a);
        }
      `,
    };
  }

  public setChromaAmount(amount: number): void {
    this.chromaPass.uniforms['amount'].value = amount;
  }

  public render(): void {
    this.composer.render();
  }

  public resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }
}
