import * as THREE from 'three';

export class Flag {
    public mesh: THREE.Group;
    public team: string; // 'red' | 'blue'
    public state: 'home' | 'carried' | 'dropped';
    public carrierId: string | null = null;
    public homePosition: THREE.Vector3;
    private light: THREE.PointLight;
    private cylinder: THREE.Mesh;

    constructor(scene: THREE.Scene, team: string, position: THREE.Vector3) {
        this.team = team;
        this.homePosition = position.clone();
        this.state = 'home';

        // Create Mesh Group
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // Flag Pole
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2;
        this.mesh.add(pole);

        // Flag Banner
        const bannerGeo = new THREE.BoxGeometry(1.5, 1, 0.1);
        const color = team === 'red' ? 0xff0000 : 0x0000ff;
        const bannerMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        this.cylinder = new THREE.Mesh(bannerGeo, bannerMat);
        this.cylinder.position.set(0.75, 3.5, 0);
        this.mesh.add(this.cylinder);

        // Light
        this.light = new THREE.PointLight(color, 2, 10);
        this.light.position.set(0, 3, 0);
        this.mesh.add(this.light);

        scene.add(this.mesh);
    }

    public update(dt: number) {
        // Bobbing animation if dropped or home
        if (this.state !== 'carried') {
            const time = Date.now() * 0.002;
            this.mesh.position.y = this.homePosition.y + Math.sin(time) * 0.2;
            this.mesh.rotation.y += dt;
        }
    }

    public pickup(carrierId: string) {
        this.state = 'carried';
        this.carrierId = carrierId;
        this.mesh.visible = false; // Hide flag when carried (attached to player model instead?)
        // Ideally attach to player model, but for now just hide
    }

    public drop(position: THREE.Vector3) {
        this.state = 'dropped';
        this.carrierId = null;
        this.mesh.visible = true;
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5; // Ensure it's on ground
    }

    public returnHome() {
        this.state = 'home';
        this.carrierId = null;
        this.mesh.visible = true;
        this.mesh.position.copy(this.homePosition);
    }
}
