import * as THREE from 'three';

export class ZoneSystem {
    private scene: THREE.Scene;
    private zoneMesh!: THREE.Mesh;
    private zoneMaterial!: THREE.ShaderMaterial;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.initZone();
    }

    private initZone(): void {
        const geometry = new THREE.CylinderGeometry(1, 1, 100, 64, 1, true);

        this.zoneMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x4b0082) }, // Indigo/Purple
                opacity: { value: 0.6 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vUv = uv;
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform float opacity;
                varying vec2 vUv;
                varying vec3 vPos;

                // Simple hash function
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }

                // 2D Noise
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
                }

                // FBM for clouds
                float fbm(vec2 p) {
                    float v = 0.0;
                    float a = 0.5;
                    for (int i = 0; i < 5; i++) {
                        v += a * noise(p);
                        p *= 2.0;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    // Scrolling clouds
                    vec2 uv = vUv * vec2(10.0, 2.0); // Stretch horizontally
                    float n = fbm(uv + vec2(time * 0.2, time * 0.1));
                    
                    // Second layer moving differently
                    float n2 = fbm(uv * 1.5 - vec2(time * 0.3, time * 0.2));
                    
                    float storm = n * n2;
                    
                    // Darker base, lighter peaks
                    vec3 finalColor = mix(color * 0.5, color * 1.5, storm);
                    
                    // Alpha fade
                    float alpha = opacity * smoothstep(0.2, 0.8, storm);
                    
                    // Vertical fade
                    float edgeFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                    
                    gl_FragColor = vec4(finalColor, alpha * edgeFade);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.zoneMesh = new THREE.Mesh(geometry, this.zoneMaterial);
        this.zoneMesh.position.y = 50; // Center vertically
        this.zoneMesh.visible = false;
        this.scene.add(this.zoneMesh);
    }

    public update(radius: number, time: number): void {
        this.zoneMesh.scale.set(radius, 1, radius);
        this.zoneMaterial.uniforms.time.value = time;
        this.zoneMesh.visible = true;
    }

    public setVisible(visible: boolean): void {
        this.zoneMesh.visible = visible;
    }
}
