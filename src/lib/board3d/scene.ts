import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { make_pieces } from './pieces';

export type View = 't' | 'p' | 'l' | 's';

export type Marks = {
	l?: number[]; // last move from, to
	s?: number; // selected square
	d?: number[]; // quiet targets of the selected piece
	c?: number[]; // capture targets of the selected piece
	k?: number; // king in check
	h?: number[]; // hint from, to
};

export type Look = {
	p: Float32Array; // palette c0 c1 c2 c3 bg, rgb 0-1
	b: number; // breath, 0 empty to 1 full
	l: number; // living colours, 0 off or 1 on
};

type Pc = {
	c: string; // colour and kind, e.g. wN
	q: number; // square, a1 = 0, h8 = 63
	x: number; // world x
	z: number; // world z
	y: number; // lift above the board
	fx: number; // slide start x
	fz: number; // slide start z
	t: number; // slide start, ms, 0 when not sliding
	d: number; // slide length, ms
	h: number; // slide hop height
	b: number; // born, ms
	k: number; // dies from, ms, 0 while alive
	u?: boolean; // reused by the current set_fen
};

const FOV = 26;
// the lights darken the tiles; this brings them back to the flat board's colour
const TILE = 0.63;
// the canvas is this much wider than the board, so tall pieces and tilted views have room
const SPAN = 1.24;
const TALL: Record<string, number> = { P: 0.74, R: 0.88, N: 1, B: 1.06, Q: 1.22, K: 1.37 };
const PRESETS: Record<View, number[]> = { t: [0.001, 0], p: [0.72, 0], l: [1.08, 0], s: [0.95, Math.PI / 2] };
const AXES = ['az', 'pol', 'z'] as const;
// the board plus a full set of pieces; every view is framed around it
const HULL = [-1, 1].flatMap((x) => [-1, 1].flatMap((z) => [
	new THREE.Vector3(4.45 * x, -0.24, 4.45 * z),
	new THREE.Vector3(4.45 * x, -0.44, 4.45 * z),
	new THREE.Vector3(3.5 * x, 0.9, 3.5 * z),
	new THREE.Vector3(0.5 * x, 1.37, 3.5 * z)
]));

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const wx = (q: number) => (q % 8) - 3.5;
const wz = (q: number) => 3.5 - (q >> 3);
const under = (x: number, z: number) => {
	const f = Math.round(x + 3.5);
	const r = Math.round(3.5 - z);
	return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;
};

function hash(x: number, y: number) {
	const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return h - Math.floor(h);
}

function noise(x: number, y: number) {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const ux = smooth(x - ix);
	const uy = smooth(y - iy);
	return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy);
}

function pal(p: Float32Array, t: number, k: number, c: THREE.Color) {
	t = clamp(t) * 3;
	const i = t < 1 ? 0 : t < 2 ? 1 : 2;
	const f = smooth(t - i);
	return c.setRGB(mix(p[i * 3], p[i * 3 + 3], f) * k, mix(p[i * 3 + 1], p[i * 3 + 4], f) * k, mix(p[i * 3 + 2], p[i * 3 + 5], f) * k, THREE.SRGBColorSpace);
}

function parse(fen: string) {
	const out: (string | null)[] = Array(64).fill(null);
	fen.split(' ')[0].split('/').forEach((row, i) => {
		let f = 0;
		for (const ch of row) {
			if (ch >= '1' && ch <= '8') f += +ch;
			else out[(7 - i) * 8 + f++] = (ch < 'a' ? 'w' : 'b') + ch.toUpperCase();
		}
	});
	return out;
}

function radial(a: number) {
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const x = c.getContext('2d')!;
	const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, `rgba(255,255,255,${a})`);
	g.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`);
	g.addColorStop(1, 'rgba(255,255,255,0)');
	x.fillStyle = g;
	x.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(c);
}

// ray against a piece's upright cylinder; cheaper and kinder to fingers than its mesh
function through(o: THREE.Vector3, d: THREE.Vector3, cx: number, cz: number, h: number, r = 0.34) {
	const ox = o.x - cx;
	const oz = o.z - cz;
	const a = d.x * d.x + d.z * d.z;
	const b = ox * d.x + oz * d.z;
	const disc = b * b - a * (ox * ox + oz * oz - r * r);
	let t = Infinity;
	if (a > 1e-9 && disc >= 0) {
		const s = (-b - Math.sqrt(disc)) / a;
		const y = o.y + s * d.y;
		if (s > 0 && y >= 0 && y <= h) t = s;
	}
	if (d.y < 0) {
		const s = (h - o.y) / d.y;
		const px = ox + s * d.x;
		const pz = oz + s * d.z;
		if (s > 0 && px * px + pz * pz <= r * r) t = Math.min(t, s);
	}
	return t;
}

export function make_board3d(canvas: HTMLCanvasElement, still: boolean, feed: (look: Look) => void) {
	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
	} catch {
		return null;
	}
	renderer.setClearColor(0x000000, 0);
	// only the pieces are tone mapped; tiles and glows keep the flat board's exact colours
	renderer.toneMapping = THREE.NeutralToneMapping;

	const scene = new THREE.Scene();
	const pmrem = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	scene.environment = pmrem.fromScene(room, 0.04).texture;
	scene.environmentIntensity = 0.5;
	room.dispose();
	pmrem.dispose();
	const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 60);

	const key = new THREE.DirectionalLight(0xffe8d8, 1.6);
	key.position.set(4, 10, 6);
	const rim = new THREE.DirectionalLight(0xaab6ff, 1.1);
	rim.position.set(-6, 5, -8);
	scene.add(new THREE.HemisphereLight(0xe9e2f5, 0x1b1728, 0.85), key, rim);

	const plate_mat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.9, toneMapped: false });
	const plate = new THREE.Mesh(new RoundedBoxGeometry(8.9, 0.2, 8.9, 4, 0.09), plate_mat);
	plate.position.y = -0.34;
	scene.add(plate);

	const glow = { value: 0.45 };
	// matte like the flat board; any shine turns the dark squares grey
	const tile_mat = new THREE.MeshLambertMaterial({ toneMapped: false });
	tile_mat.onBeforeCompile = (sh) => {
		sh.uniforms.uGlow = glow;
		sh.fragmentShader = 'uniform float uGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor.rgb * uGlow;');
	};
	const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(0.9, 0.24, 0.9, 3, 0.1), tile_mat, 64);
	tiles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(192), 3);

	const pack = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number, color = false) => {
		const m = new THREE.InstancedMesh(geo, mat, n);
		if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
		m.frustumCulled = false;
		m.count = 0;
		scene.add(m);
		return m;
	};
	tiles.frustumCulled = false;
	scene.add(tiles);

	const geos = make_pieces();
	const mats: Record<string, THREE.Material> = {
		w: new THREE.MeshPhysicalMaterial({ color: 0xe9dfd0, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.3 }),
		b: new THREE.MeshPhysicalMaterial({ color: 0x2c2433, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.12 })
	};
	const packs: Record<string, THREE.InstancedMesh> = {};
	for (const c of 'wb') for (const k of 'PNBRQK') packs[c + k] = pack(geos[k], mats[c], 32);
	const all = Object.values(packs);

	const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
	const soft = radial(1);
	const shadows = pack(flat, new THREE.MeshBasicMaterial({ color: 0x000000, map: radial(0.62), transparent: true, depthWrite: false }), 64);
	const add = { map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false };
	const blobs = pack(flat, new THREE.MeshBasicMaterial(add), 40, true);
	const rings = pack(new THREE.RingGeometry(0.33, 0.41, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, map: null }), 20, true);
	shadows.renderOrder = 1;
	blobs.renderOrder = rings.renderOrder = 2;
	const GLOW = new THREE.Color(0xe9a47c);
	const RED = new THREE.Color(0xff7a7a);
	const PALE = new THREE.Color(0xece7f1);

	const glyphs = document.createElement('canvas');
	glyphs.width = 1024;
	glyphs.height = 64;
	const glyph_tex = new THREE.CanvasTexture(glyphs);
	glyph_tex.colorSpace = THREE.SRGBColorSpace;
	glyph_tex.anisotropy = 4;
	const draw_glyphs = () => {
		const x = glyphs.getContext('2d')!;
		x.clearRect(0, 0, 1024, 64);
		x.fillStyle = 'rgba(236,231,241,0.72)';
		x.font = '400 34px "Geist Mono", ui-monospace, monospace';
		x.textAlign = 'center';
		x.textBaseline = 'middle';
		[...'abcdefgh12345678'].forEach((ch, i) => x.fillText(ch, i * 64 + 32, 34));
		glyph_tex.needsUpdate = true;
		kick();
	};
	const lab_pos = new Float32Array(16 * 12);
	const lab_geo = new THREE.BufferGeometry();
	lab_geo.setAttribute('position', new THREE.BufferAttribute(lab_pos, 3));
	lab_geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 16 }, (_, i) => [i / 16, 1, (i + 1) / 16, 1, i / 16, 0, (i + 1) / 16, 0]).flat()), 2));
	lab_geo.setIndex(Array.from({ length: 16 }, (_, i) => [i * 4, i * 4 + 2, i * 4 + 3, i * 4, i * 4 + 3, i * 4 + 1]).flat());
	const labels = new THREE.Mesh(lab_geo, new THREE.MeshBasicMaterial({ map: glyph_tex, transparent: true, depthWrite: false, toneMapped: false }));
	labels.frustumCulled = false;
	labels.renderOrder = 1;
	scene.add(labels);

	let side = 0;
	let dpr = Math.min(devicePixelRatio || 1, 2);
	const cur = { az: 0, pol: PRESETS.t[0], z: 1 };
	const tgt = { ...cur };
	const focus = new THREE.Vector3();
	const dir = new THREE.Vector3();
	const v3 = new THREE.Vector3();
	const ax = new THREE.Vector3();
	const ay = new THREE.Vector3();
	const fit = { pol: -1, az: 0, a: 0, r: 18.5 };
	let pcs: Pc[] = [];
	let drag: Pc | null = null;
	const aim_pt = { x: 0, z: 0 };
	let hover = -1;
	let marks: Marks = {};
	let fresh = true;
	const ripples: { q: number; t: number }[] = [];
	const look: Look = { p: new Float32Array(15), b: 0.5, l: 0 };
	let lv = 0;
	const off = new Float32Array(64);
	const lift = new Float32Array(64);
	const c1 = new THREE.Color();
	const c2 = new THREE.Color();
	const m4 = new THREE.Matrix4();
	const pos = new THREE.Vector3();
	const scl = new THREE.Vector3();
	const q_id = new THREE.Quaternion();
	// knights look left, as in diagrams, so the default view shows their profile
	const q_face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
	const ray = new THREE.Raycaster();
	const ndc = new THREE.Vector2();

	function place_labels() {
		const w = side === 0 ? 1 : -1;
		const h = 0.15 * w;
		const y = -0.232;
		for (let i = 0; i < 16; i++) {
			const k = i % 8;
			const cx = i < 8 ? k - 3.5 : -4.2 * w;
			const cz = i < 8 ? 4.2 * w : 3.5 - k;
			lab_pos.set([cx - h, y, cz - h, cx + h, y, cz - h, cx - h, y, cz + h, cx + h, y, cz + h], i * 12);
		}
		lab_geo.attributes.position.needsUpdate = true;
	}

	function aim(v: View, instant = false) {
		const [pol, az] = PRESETS[v];
		tgt.az = cur.az + wrap(side + az - cur.az);
		tgt.pol = pol;
		if (instant || still) Object.assign(cur, tgt);
		kick();
	}

	// top view matches the flat board square for square; tilted views keep the whole set inside the board's box
	function frame_all() {
		const goal = mix(0.885, 1 / SPAN, smooth(clamp(cur.pol / 0.6)));
		const h = Math.tan(((FOV / 2) * Math.PI) / 180);
		let r = 18.5;
		focus.set(0, 0, 0);
		for (let i = 0; i < 4; i++) {
			camera.position.copy(focus).addScaledVector(dir, r);
			camera.lookAt(focus);
			camera.updateMatrixWorld();
			let x0 = 9;
			let x1 = -9;
			let y0 = 9;
			let y1 = -9;
			for (const p of HULL) {
				v3.copy(p).project(camera);
				x0 = Math.min(x0, v3.x);
				x1 = Math.max(x1, v3.x);
				y0 = Math.min(y0, v3.y);
				y1 = Math.max(y1, v3.y);
			}
			ax.setFromMatrixColumn(camera.matrixWorld, 0);
			ay.setFromMatrixColumn(camera.matrixWorld, 1);
			focus.addScaledVector(ax, ((x0 + x1) / 2) * r * h * camera.aspect).addScaledVector(ay, ((y0 + y1) / 2) * r * h);
			r *= Math.max(x1 - x0, y1 - y0) / 2 / goal;
		}
		Object.assign(fit, { pol: cur.pol, az: cur.az, a: camera.aspect, r });
	}

	function slide(p: Pc, q: number, now: number) {
		const dist = Math.hypot(wx(q) - p.x, wz(q) - p.z);
		p.fx = p.x;
		p.fz = p.z;
		p.q = q;
		p.t = now;
		p.d = still ? 1 : Math.min(620, 360 + dist * 30);
		p.h = p.c[1] === 'N' ? 0.6 : 0.14 + dist * 0.035;
	}

	function set_fen(fen: string) {
		const now = performance.now();
		const next = parse(fen);
		const at: (Pc | null)[] = Array(64).fill(null);
		for (const p of pcs) if (!p.k) at[p.q] = p;
		const gone: Pc[] = [];
		const come: number[] = [];
		for (let q = 0; q < 64; q++) {
			if ((at[q]?.c ?? null) === next[q]) continue;
			if (at[q]) gone.push(at[q]!);
			if (next[q]) come.push(q);
		}
		const bulk = gone.length + come.length > 8;
		const landed: Record<number, number> = {};
		come.forEach((q, i) => {
			const c = next[q]!;
			let best: Pc | null = null;
			let bd = 1e9;
			if (!bulk) for (const p of gone) {
				const d = Math.hypot(wx(p.q) - wx(q), wz(p.q) - wz(q));
				if (!p.u && p.c === c && d < bd) {
					bd = d;
					best = p;
				}
			}
			if (best) {
				best.u = true;
				slide(best, q, now);
				landed[q] = best.d;
			} else {
				const born = fresh ? -1e4 : now + (bulk ? i * 14 : 0);
				pcs.push({ c, q, x: wx(q), z: wz(q), y: 0, fx: 0, fz: 0, t: 0, d: 0, h: 0, b: born, k: 0 });
			}
		});
		for (const p of gone) {
			if (p.u) delete p.u;
			else p.k = now + (landed[p.q] ?? 0) * 0.55;
		}
		if (drag?.k) drag = null;
		fresh = false;
		kick();
	}

	function cast(x: number, y: number) {
		const r = canvas.getBoundingClientRect();
		ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
		ray.setFromCamera(ndc, camera);
		return ray.ray;
	}

	function pick(x: number, y: number) {
		const { origin: o, direction: d } = cast(x, y);
		if (d.y >= 0) return -1;
		let best = -o.y / d.y;
		let hit = under(o.x + best * d.x, o.z + best * d.z);
		for (const p of pcs) {
			if (p.k || p === drag) continue;
			const t = through(o, d, p.x, p.z, TALL[p.c[1]]);
			if (t < best) {
				best = t;
				hit = p.q;
			}
		}
		return hit;
	}

	function resize() {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		renderer.setPixelRatio(dpr);
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		kick();
	}

	let clock = 0;
	function update(now: number, dt: number) {
		let busy = false;
		const k = still ? 1 : 1 - Math.exp(-6.5 * dt);
		for (const n of AXES) {
			cur[n] += (tgt[n] - cur[n]) * k;
			if (Math.abs(tgt[n] - cur[n]) > 1e-4) busy = true;
		}
		dir.set(Math.sin(cur.pol) * Math.sin(cur.az), Math.cos(cur.pol), Math.sin(cur.pol) * Math.cos(cur.az));
		if (cur.pol !== fit.pol || cur.az !== fit.az || camera.aspect !== fit.a) frame_all();
		camera.position.copy(focus).addScaledVector(dir, fit.r * cur.z);
		camera.lookAt(focus);

		const b = still ? 0.6 : look.b;
		const drift = 0.1 * Math.sin(clock * 0.05);
		lv += (look.l - lv) * (still ? 1 : 1 - Math.exp(-4 * dt));
		glow.value = 0.3;
		plate_mat.color.copy(pal(look.p, 0.1, 0.55, c1));
		while (ripples.length && clock - ripples[0].t > 3.2) ripples.shift();
		if (ripples.length) busy = true;
		const ease_lift = still ? 1 : 1 - Math.exp(-16 * dt);
		// tiles breathe like the flat board: 0.85 to 0.92 of a square
		scl.set(0.944 + 0.078 * b, 1, 0.944 + 0.078 * b);
		for (let q = 0; q < 64; q++) {
			const f = q % 8;
			const rk = q >> 3;
			const want = q === hover ? 1 : 0;
			lift[q] += (want - lift[q]) * ease_lift;
			if (Math.abs(want - lift[q]) > 0.005) busy = true;
			let y = 0.04 * lift[q];
			for (const rp of ripples) {
				const age = clock - rp.t;
				const d = Math.hypot(f - (rp.q % 8), rk - (rp.q >> 3));
				const front = age * 5 - d;
				if (front > 0) y += 0.09 * Math.sin(front * 2.4) * Math.exp(-age * 1.4) * Math.exp(-d * 0.25) * clamp(front * 2);
			}
			off[q] = y;
			const lite = (f + rk) % 2 === 1;
			const tv = (noise(f * 0.9 + clock * 0.04, rk * 0.9 - clock * 0.03) - 0.5) * 0.12;
			const k = (0.8 + 0.28 * b) * (0.97 + 0.03 * Math.sin(clock * 0.8 - Math.hypot(f - 3.5, rk - 3.5) * 0.9));
			pal(look.p, (lite ? 0.8 : 0.18) + drift * 0.3, ((lite ? 1.05 : 0.85) + tv) * k, c2);
			if (lv > 0.001) {
				const tn = noise(f * 0.55 + clock * 0.06, rk * 0.55 + clock * 0.05) * 0.7 + noise(f * 1.3 - clock * 0.04, rk * 1.3) * 0.3;
				c2.lerp(pal(look.p, (tn - 0.15) / 0.6 + drift, (lite ? 1.12 : 0.58) * k, c1), lv);
			}
			tiles.setColorAt(q, c2.multiplyScalar(TILE * (1 + 0.25 * lift[q])));
			tiles.setMatrixAt(q, m4.compose(pos.set(f - 3.5, y - 0.12, 3.5 - rk), q_id, scl));
		}
		tiles.instanceMatrix.needsUpdate = true;
		tiles.instanceColor!.needsUpdate = true;

		for (const m of all) m.count = 0;
		let ns = 0;
		const rise = 1 - Math.exp(-14 * dt);
		let live = 0;
		for (const p of pcs) {
			let s = 1;
			let y = 0;
			const floor = p === drag ? 0 : off[p.q];
			if (p.k) {
				const t = clamp((now - p.k) / (still ? 1 : 320));
				if (t >= 1) continue;
				s = 1 - ease(t);
				y = floor + p.y - 0.3 * t;
				busy = true;
			} else {
				const grow = still ? 1 : clamp((now - p.b) / 380);
				if (grow < 1) {
					s = 0.2 + 0.8 * ease(grow);
					busy = true;
				}
				const want = p === drag ? 0.45 : p.q === marks.s ? 0.1 : 0;
				p.y += (want - p.y) * (still ? 1 : rise);
				if (Math.abs(want - p.y) > 0.002) busy = true;
				let hop = 0;
				if (p === drag) {
					p.x += (aim_pt.x - p.x) * (still ? 1 : 1 - Math.exp(-22 * dt));
					p.z += (aim_pt.z - p.z) * (still ? 1 : 1 - Math.exp(-22 * dt));
					if (Math.abs(aim_pt.x - p.x) + Math.abs(aim_pt.z - p.z) > 0.002) busy = true;
				} else if (p.t) {
					const t = clamp((now - p.t) / p.d);
					const e = ease(t);
					p.x = mix(p.fx, wx(p.q), e);
					p.z = mix(p.fz, wz(p.q), e);
					hop = Math.sin(Math.PI * t) * p.h;
					if (t >= 1) p.t = 0;
					busy = true;
				}
				y = floor + p.y + hop;
			}
			const m = packs[p.c];
			if (m.count < 32) m.setMatrixAt(m.count++, m4.compose(pos.set(p.x, y, p.z), p.c[1] === 'N' ? q_face : q_id, scl.setScalar(s)));
			const sh = 0.95 * s * (1 + (y - floor) * 0.6);
			shadows.setMatrixAt(ns++, m4.compose(pos.set(p.x, floor + 0.004, p.z), q_id, scl.setScalar(sh)));
			pcs[live++] = p;
		}
		pcs.length = live;
		for (const m of all) m.instanceMatrix.needsUpdate = true;
		shadows.count = ns;
		shadows.instanceMatrix.needsUpdate = true;

		blobs.count = rings.count = 0;
		mark(blobs, marks.l?.[0], 0.95, GLOW, 0.38);
		mark(blobs, marks.l?.[1], 0.95, GLOW, 0.5);
		mark(blobs, marks.s, 1.05, GLOW, 0.85);
		mark(blobs, marks.k, 1.1, RED, 0.9);
		mark(blobs, marks.h?.[1], 1, GLOW, 0.55 + 0.25 * Math.sin(clock * 3));
		mark(rings, marks.h?.[0], 1, GLOW, 0.85);
		if (marks.d) for (const q of marks.d) mark(blobs, q, 0.34, PALE, 0.9);
		if (marks.c) for (const q of marks.c) mark(rings, q, 1, PALE, 0.55);
		blobs.instanceMatrix.needsUpdate = rings.instanceMatrix.needsUpdate = true;
		blobs.instanceColor!.needsUpdate = rings.instanceColor!.needsUpdate = true;
		return busy;
	}

	function mark(m: THREE.InstancedMesh, q: number | undefined, size: number, color: THREE.Color, a: number) {
		if (q == null || q < 0 || m.count >= m.instanceMatrix.count) return;
		m.setMatrixAt(m.count, m4.compose(pos.set(wx(q), off[q] + 0.006, wz(q)), q_id, scl.setScalar(size)));
		m.setColorAt(m.count++, c1.copy(color).multiplyScalar(a));
	}

	let raf = 0;
	let last = 0;
	let dirty = true;
	let hot = true;
	let seen = -1;
	let onscreen = true;
	let ema = 16;
	let count = 0;
	function loop(now: number) {
		raf = 0;
		if (!onscreen) return;
		raf = requestAnimationFrame(loop);
		feed(look);
		if (still) {
			let sig = look.l * 7;
			for (let i = 0; i < 15; i++) sig += look.p[i] * (i + 1);
			if (sig !== seen) {
				seen = sig;
				dirty = true;
			}
		}
		// an idle board only breathes and drifts, well under a pixel a frame at 20 fps
		if (!dirty && !hot && (still || now - last < 50)) return;
		const gap = now - last;
		if (hot && gap < 100) {
			ema += (gap - ema) * 0.05;
			if (++count % 60 === 0 && ema > 25 && dpr > 1) {
				dpr = Math.max(1, dpr * 0.85);
				resize();
			}
		}
		const dt = Math.min(gap / 1000, 0.1);
		last = now;
		dirty = false;
		if (!still) clock += dt;
		hot = update(now, dt);
		renderer.render(scene, camera);
	}

	function kick() {
		dirty = true;
		if (!raf && onscreen) raf = requestAnimationFrame(loop);
	}

	const io = new IntersectionObserver(([e]) => {
		onscreen = e.isIntersecting;
		if (onscreen) kick();
	});
	io.observe(canvas);

	place_labels();
	draw_glyphs();
	document.fonts?.ready.then(draw_glyphs);
	resize();

	return {
		set_fen,
		pick,
		resize,
		aim,
		set_side(s: 'w' | 'b', instant = false) {
			const next = s === 'w' ? 0 : Math.PI;
			if (next === side) return;
			tgt.az += wrap(next - side);
			side = next;
			if (instant || still) cur.az = tgt.az;
			place_labels();
			kick();
		},
		orbit(dx: number, dy: number) {
			tgt.az -= dx * 0.008;
			tgt.pol = clamp(tgt.pol - dy * 0.006, 0.001, 1.3);
			if (still) Object.assign(cur, tgt);
			kick();
		},
		zoom_by(f: number) {
			tgt.z = clamp(tgt.z * f, 0.88, 1.6);
			if (still) cur.z = tgt.z;
			kick();
		},
		hover(q: number) {
			if (q === hover) return;
			hover = q;
			kick();
		},
		marks(m: Marks) {
			marks = m;
			kick();
		},
		ripple(q: number) {
			if (still) return;
			ripples.push({ q, t: clock });
			kick();
		},
		lift(q: number) {
			drag = pcs.find((p) => p.q === q && !p.k) ?? null;
			if (!drag) return;
			drag.t = 0;
			aim_pt.x = drag.x;
			aim_pt.z = drag.z;
			kick();
		},
		drag_to(x: number, y: number) {
			if (!drag) return;
			// the square under the pointer is the target; the piece floats straight above it
			const { origin: o, direction: d } = cast(x, y);
			if (d.y >= 0) return;
			const t = -o.y / d.y;
			aim_pt.x = clamp(o.x + t * d.x, -4.3, 4.3);
			aim_pt.z = clamp(o.z + t * d.z, -4.3, 4.3);
			hover = under(aim_pt.x, aim_pt.z);
			kick();
		},
		drop(hold = false) {
			if (!drag) return -1;
			const q = under(aim_pt.x, aim_pt.z);
			if (hold) return q;
			slide(drag, drag.q, performance.now());
			drag = null;
			hover = -1;
			kick();
			return q;
		},
		dispose() {
			cancelAnimationFrame(raf);
			onscreen = false;
			io.disconnect();
			renderer.dispose();
			renderer.forceContextLoss();
		}
	};
}

export type Board3d = NonNullable<ReturnType<typeof make_board3d>>;
