import * as THREE from 'three';

export class EnemyFactory {
    private static createNeonMat(color: number, wireframe: boolean = false, transparent: boolean = false, opacity: number = 1.0): THREE.Material {
        return new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: wireframe ? 3.0 : 1.5, // Increased intensity for bloom
            wireframe: wireframe,
            transparent: transparent,
            opacity: opacity,
            metalness: 0.8,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
    }

    // Helper to create a capsule using Cylinder + 2 Spheres (since CapsuleGeometry is missing in r128)
    private static createCapsule(radius: number, length: number, material: THREE.Material): THREE.Group {
        const group = new THREE.Group();

        // Length of capsule includes the spheres. Cylinder height = length - 2*radius
        const cylinderHeight = Math.max(0, length - radius * 2);
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, cylinderHeight, 16), material);
        group.add(cylinder);

        const topSphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
        topSphere.position.y = cylinderHeight / 2;
        group.add(topSphere);

        const bottomSphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
        bottomSphere.position.y = -cylinderHeight / 2;
        group.add(bottomSphere);

        return group;
    }

    public static createEnemyMesh(type: string, color: number): THREE.Group {
        switch (type) {
            case 'grunt': return this.createGrunt(color);
            case 'shooter': return this.createShooter(color);
            case 'heavy': return this.createHeavy(color);
            case 'swarmer': return this.createSwarmer(color);
            case 'viper': return this.createViper(color);
            case 'bulwark': return this.createBulwark(color);
            case 'spectre': return this.createSpectre(color);
            case 'razor': return this.createRazor(color);
            default: return this.createGrunt(color);
        }
    }

    private static createGrunt(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color); // Solid for grunt (was wireframe)

        // Capsule(0.4, 1.0)
        const body = this.createCapsule(0.4, 1.4, mat);
        body.position.y = 0.9;
        body.name = 'body';
        group.add(body);

        // Add head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), this.createNeonMat(color));
        head.position.y = 1.6;
        head.name = 'head';
        group.add(head);

        return group;
    }

    private static createShooter(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);

        const body = this.createCapsule(0.35, 1.3, mat);
        body.position.y = 0.8;
        body.name = 'body';

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), this.createNeonMat(0xB040FF));
        head.position.y = 1.5;
        head.name = 'head';

        const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
        eye.position.set(0, 0, 0.21);
        head.add(eye);

        group.add(body, head);
        return group;
    }

    private static createHeavy(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);

        const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), mat);
        bottom.position.y = 0.25;
        bottom.name = 'body';

        const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16), mat);
        mid.position.y = 0.8;
        mid.name = 'body_mid';

        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16), mat);
        top.position.y = 1.35;
        top.name = 'body_top';

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
        head.position.y = 1.8;
        head.name = 'head';

        group.add(bottom, mid, top, head);
        return group;
    }

    private static createSwarmer(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);
        // 3 small entities acting as one unit
        const pos = [{ x: 0, y: 0.3, z: 0 }, { x: 0.35, y: 0.2, z: 0.2 }, { x: -0.35, y: 0.4, z: -0.1 }];

        // Main body
        const main = this.createCapsule(0.15, 0.5, mat);
        main.position.set(pos[0].x, pos[0].y, pos[0].z);
        main.name = 'body';
        group.add(main);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat);
        head.position.set(0, 0.6, 0);
        head.name = 'head';
        group.add(head);

        // Others
        for (let i = 1; i < pos.length; i++) {
            const p = pos[i];
            const m = this.createCapsule(0.15, 0.5, mat);
            m.position.set(p.x, p.y, p.z);
            group.add(m);
        }

        return group;
    }

    private static createViper(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);

        const body = this.createCapsule(0.15, 1.6, mat);
        body.position.y = 1.0;
        body.rotation.z = Math.PI / 12; // Slight tilt
        body.name = 'body';

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
        head.position.set(0, 1.8, 0);
        head.name = 'head';
        group.add(head);

        const rGeo = new THREE.TorusGeometry(0.3, 0.02, 3, 16);
        const rMat = this.createNeonMat(color);
        const r1 = new THREE.Mesh(rGeo, rMat); r1.position.y = 0.3;
        const r2 = new THREE.Mesh(rGeo, rMat); r2.position.y = -0.3;

        body.add(r1, r2);
        group.add(body);
        return group;
    }

    private static createBulwark(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);

        const body = this.createCapsule(0.5, 1.4, mat);
        body.position.y = 0.9;
        body.name = 'body';

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
        head.position.y = 1.7;
        head.name = 'head';
        group.add(head);

        const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 32, 1, true), this.createNeonMat(color, false, true, 0.4));
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, 0.9, 0.6);

        const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.05), this.createNeonMat(0xFFFFFF));
        shield.add(cross, cross.clone().rotateZ(Math.PI / 2));

        group.add(body, shield);
        return group;
    }

    private static createSpectre(color: number): THREE.Group {
        const group = new THREE.Group();

        // Outer ghost shell
        const matOuter = this.createNeonMat(color, false, true, 0.2);
        const bodyOuter = this.createCapsule(0.3, 1.4, matOuter);
        bodyOuter.position.y = 1.0;
        bodyOuter.name = 'body';

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matOuter);
        head.position.y = 1.8;
        head.name = 'head';
        group.add(head);

        // Inner core
        const matInner = this.createNeonMat(0xAAAAFF, true, true, 0.4);
        const bodyInner = this.createCapsule(0.3, 1.4, matInner);
        bodyInner.scale.set(0.7, 0.7, 0.7);
        bodyInner.position.y = 1.0;

        group.add(bodyOuter, bodyInner);
        return group;
    }

    private static createRazor(color: number): THREE.Group {
        const group = new THREE.Group();
        const mat = this.createNeonMat(color);

        // Core (Body)
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), mat);
        core.position.y = 0.5;
        core.name = 'body';

        // Head? Just a smaller sphere on top
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
        head.position.y = 0.9;
        head.name = 'head';
        group.add(head);

        // Spikes
        const spikeGroup = new THREE.Group();
        spikeGroup.position.y = 0.5;
        const spikeCount = 8;
        const spikeGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
        const spikeMat = mat;

        for (let i = 0; i < spikeCount; i++) {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            const angle = (i / spikeCount) * Math.PI * 2;
            spike.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0);
            spike.rotation.z = angle - Math.PI / 2;
            spikeGroup.add(spike);
        }

        // Blade
        const bladeGeo = new THREE.BoxGeometry(1.2, 0.05, 0.1);
        const blade = new THREE.Mesh(bladeGeo, this.createNeonMat(0xFFFFFF));
        blade.position.y = 0.5;

        group.add(core, spikeGroup, blade);

        // Store references for animation
        group.userData.blade = blade;
        group.userData.spikes = spikeGroup;

        return group;
    }
}
