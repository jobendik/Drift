import * as THREE from 'three';

export class RemotePlayer {
    public mesh: THREE.Group;
    private scene: THREE.Scene;
    public userId: string;

    private targetPosition: THREE.Vector3 = new THREE.Vector3();
    private targetRotationY: number = 0;

    public isSprinting: boolean = false;
    public isGrounded: boolean = true;

    public get id(): string {
        return this.userId;
    }



    constructor(scene: THREE.Scene, userId: string) {
        this.scene = scene;
        this.userId = userId;
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
    }

    private createMesh(): THREE.Group {
        const group = new THREE.Group();

        // Simple cylinder representation (CapsuleGeometry not available in 0.128.0)
        const geometry = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red for enemies/others
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.y = 0.9; // Center pivot at feet

        group.add(cylinder);

        // Add a "head" or "eye" to see rotation
        const eyeGeo = new THREE.BoxGeometry(0.2, 0.1, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 1.6, -0.3); // Forward face
        group.add(eye);

        return group;
    }

    public updateState(position: any, rotation: any, isSprinting: boolean, isGrounded: boolean) {
        this.targetPosition.set(position.x, position.y, position.z);
        this.targetRotationY = rotation.y;
        this.isSprinting = isSprinting;
        this.isGrounded = isGrounded;
        // TODO: Use isSprinting and isGrounded for animation or visual cues
    }

    public update(dt: number) {
        // Simple lerp for smoothness
        this.mesh.position.lerp(this.targetPosition, 10 * dt);

        // Lerp rotation (shortest path)
        let diff = this.targetRotationY - this.mesh.rotation.y;
        // Normalize angle difference to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        this.mesh.rotation.y += diff * 10 * dt;
    }

    public destroy() {
        this.scene.remove(this.mesh);
    }

    public setTeam(team: string) {
        const cylinder = this.mesh.children[0] as THREE.Mesh;
        if (cylinder && cylinder.material instanceof THREE.MeshStandardMaterial) {
            if (team === 'blue') {
                cylinder.material.color.setHex(0x3b82f6); // Blue
            } else if (team === 'red') {
                cylinder.material.color.setHex(0xef4444); // Red
            } else {
                cylinder.material.color.setHex(0xff0000); // Default Red
            }
        }
    }
}
