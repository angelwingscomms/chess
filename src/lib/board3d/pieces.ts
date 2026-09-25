import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

type P = [number, number];

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 10, ry = r): P[] =>
	Array.from({ length: n + 1 }, (_, i) => {
		const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
		return [cx + r * Math.cos(a), cy + ry * Math.sin(a)];
	});

const foot = (r: number): P[] => [
	[0, 0],
	[r - 0.02, 0],
	...arc(r - 0.02, 0.02, 0.02, -90, 0, 5),
	...arc(r - 0.025, 0.045, 0.025, 0, 90, 6),
	[r * 0.87, 0.075],
	...arc(r * 0.87, 0.093, 0.018, -90, 90, 8),
	[r * 0.8, 0.12]
];

const collar = (y: number, r: number, inner: number): P[] => [[inner, y - 0.022], ...arc(r - 0.018, y - 0.004, 0.018, -90, 90, 8), [inner, y + 0.03]];

const profiles: Record<string, P[]> = {
	P: [...foot(0.27), [0.2, 0.14], [0.16, 0.19], [0.13, 0.25], [0.112, 0.31], [0.105, 0.355], ...collar(0.385, 0.17, 0.1), [0.078, 0.43], ...arc(0, 0.6, 0.14, -56, 90, 16)],
	R: [...foot(0.3), [0.235, 0.15], [0.215, 0.22], [0.2, 0.33], [0.195, 0.44], [0.2, 0.5], [0.215, 0.54], ...collar(0.575, 0.265, 0.22), [0.24, 0.62], [0.255, 0.68], [0.262, 0.75], ...arc(0.24, 0.77, 0.022, 0, 90, 5), [0.185, 0.792], [0.175, 0.74], [0, 0.74]],
	N: [...foot(0.3), [0.235, 0.15], [0.225, 0.17], [0, 0.17]],
	B: [...foot(0.3), [0.225, 0.15], [0.18, 0.22], [0.145, 0.32], [0.122, 0.44], [0.112, 0.53], ...collar(0.565, 0.18, 0.105), [0.09, 0.61], ...arc(0, 0.79, 0.135, -50, 76, 18, 0.19), [0.03, 0.975], ...arc(0, 1.02, 0.042, -50, 90, 8)],
	Q: [...foot(0.32), [0.24, 0.155], [0.19, 0.24], [0.15, 0.36], [0.125, 0.5], [0.115, 0.6], ...collar(0.64, 0.19, 0.11), [0.1, 0.69], [0.11, 0.76], [0.135, 0.85], [0.175, 0.94], [0.205, 0.99], ...arc(0.188, 1.005, 0.02, -40, 90, 6), [0.13, 1.028], ...arc(0, 1.02, 0.1, 5, 72, 9), ...arc(0, 1.17, 0.05, -62, 90, 8)],
	K: [...foot(0.33), [0.25, 0.155], [0.2, 0.25], [0.16, 0.38], [0.135, 0.53], [0.125, 0.64], ...collar(0.68, 0.2, 0.12), [0.11, 0.73], [0.12, 0.8], [0.145, 0.9], [0.18, 0.99], [0.205, 1.035], ...arc(0.19, 1.05, 0.02, -40, 90, 6), [0.14, 1.072], ...arc(0, 1.05, 0.12, 12, 90, 10)]
};

function lathe(points: P[]) {
	return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(Math.max(x, 0), y)), 48).toNonIndexed();
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
	const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.35);
	g.rotateY(ry);
	g.translate(x, y, z);
	return g.index ? g.toNonIndexed() : g;
}

function ball(r: number, x: number, y: number, z: number) {
	const g = new THREE.SphereGeometry(r, 16, 12);
	g.translate(x, y, z);
	return g.toNonIndexed();
}

function knight_head() {
	const s = new THREE.Shape();
	s.moveTo(-0.18, 0.13);
	s.lineTo(0.2, 0.13);
	s.quadraticCurveTo(0.24, 0.23, 0.16, 0.31);
	s.quadraticCurveTo(0.27, 0.39, 0.36, 0.5);
	s.quadraticCurveTo(0.44, 0.58, 0.4, 0.65);
	s.quadraticCurveTo(0.35, 0.72, 0.25, 0.72);
	s.quadraticCurveTo(0.18, 0.79, 0.12, 0.88);
	s.lineTo(0.095, 0.99);
	s.lineTo(0.03, 0.91);
	s.quadraticCurveTo(-0.06, 0.9, -0.12, 0.83);
	s.quadraticCurveTo(-0.12, 0.78, -0.17, 0.76);
	s.quadraticCurveTo(-0.18, 0.7, -0.22, 0.66);
	s.quadraticCurveTo(-0.22, 0.6, -0.25, 0.55);
	s.quadraticCurveTo(-0.24, 0.48, -0.26, 0.42);
	s.quadraticCurveTo(-0.23, 0.26, -0.18, 0.13);
	const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035, bevelSegments: 5, curveSegments: 16 });
	g.translate(0, 0, -0.08);
	// thicker at the neck and mane, thinner at the muzzle and ears; linear, so the flat sides stay flat
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1.3 - 0.55 * p.getX(i) - 0.3 * p.getY(i)));
	g.computeVertexNormals();
	return g;
}

function only_normals(g: THREE.BufferGeometry) {
	for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
	return g;
}

export function make_pieces() {
	const out: Record<string, THREE.BufferGeometry> = {};
	for (const [k, pts] of Object.entries(profiles)) {
		const parts = [lathe(pts)];
		if (k === 'R') for (let i = 0; i < 4; i++) {
			const a = (i * Math.PI) / 2 + Math.PI / 4;
			parts.push(box(0.13, 0.09, 0.08, Math.cos(a) * 0.218, 0.83, Math.sin(a) * 0.218, -a));
		}
		if (k === 'Q') for (let i = 0; i < 9; i++) {
			const a = (i * Math.PI * 2) / 9;
			parts.push(ball(0.028, Math.cos(a) * 0.19, 1.035, Math.sin(a) * 0.19));
		}
		if (k === 'K') parts.push(box(0.058, 0.24, 0.058, 0, 1.25, 0), box(0.18, 0.056, 0.058, 0, 1.28, 0));
		if (k === 'N') parts.push(knight_head());
		out[k] = mergeVertices(mergeGeometries(parts.map(only_normals)));
	}
	return out;
}
