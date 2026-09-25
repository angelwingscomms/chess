import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Poly Haven "Chess Set" by Riley Queen (CC0): the six white pieces, one board square = one unit,
// knight muzzle toward +x, meshopt compressed; the recipe is in AGENTS.md
export async function load_pieces() {
	const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/pieces.glb');
	const out: Record<string, THREE.BufferGeometry> = {};
	gltf.scene.updateMatrixWorld(true);
	gltf.scene.traverse((o) => {
		const m = o as THREE.Mesh;
		if (!m.isMesh) return;
		const g = new THREE.BufferGeometry();
		// quantized attributes can't take the node's scale, so unpack them to floats first
		for (const k of ['position', 'normal']) {
			const a = m.geometry.attributes[k];
			const f = new Float32Array(a.count * 3);
			for (let i = 0; i < f.length; i++) f[i] = a.getComponent(Math.floor(i / 3), i % 3);
			g.setAttribute(k, new THREE.BufferAttribute(f, 3));
		}
		g.setIndex(m.geometry.index);
		g.applyMatrix4(m.matrixWorld);
		out[m.name] = g;
	});
	return out;
}
