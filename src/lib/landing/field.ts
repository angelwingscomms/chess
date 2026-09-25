const VERT = 'attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}';

const FRAG = `
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_breath;
uniform vec4 u_board;
uniform float u_melt;
uniform float u_hide;
uniform float u_live;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;
uniform vec3 u_glow;
uniform vec3 u_cursor;
uniform vec3 u_mark;
uniform vec4 u_rip[6];

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p = m * p;
		a *= 0.5;
	}
	return v;
}

vec3 pal(float t) {
	t = clamp(t, 0.0, 1.0) * 3.0;
	if (t < 1.0) return mix(u_c0, u_c1, smoothstep(0.0, 1.0, t));
	if (t < 2.0) return mix(u_c1, u_c2, smoothstep(1.0, 2.0, t));
	return mix(u_c2, u_c3, smoothstep(2.0, 3.0, t));
}

void main() {
	vec2 p = vec2(v_uv.x, 1.0 - v_uv.y) * u_res;
	float mr = min(u_res.x, u_res.y);
	float t = u_time;

	vec2 disp = vec2(0.0);
	float ring = 0.0;
	for (int i = 0; i < 6; i++) {
		vec4 r = u_rip[i];
		if (r.w > 0.0) {
			vec2 d = p - r.xy;
			float dist = length(d);
			float z = (dist - r.z * mr * 0.42) / (mr * 0.07);
			float band = exp(-z * z);
			float fade = exp(-r.z * 1.1) * r.w;
			disp += d / (dist + 1.0) * sin(z * 2.4) * band * fade * 10.0;
			ring += band * fade;
		}
	}
	vec2 q = p + disp;

	vec2 s = q / mr * 1.6;
	float sl = t * 0.02;
	vec2 w = vec2(fbm(s + vec2(0.0, sl)), fbm(s + vec2(5.2, 1.3 - sl)));
	float drift = 0.1 * sin(t * 0.05);
	float n = fbm(s + (1.4 + u_melt * 1.8) * w + vec2(sl * 0.7, 1.7));
	vec3 col = mix(u_bg, pal((n - 0.2) / 0.6 + drift), 0.42 + 0.33 * u_melt + 0.08 * u_breath);

	float tl = u_board.w * 0.95;
	float sn = sin(tl);
	float cs = cos(tl);
	vec2 x = (q - u_board.xy) / u_board.z;
	float den = cs - x.y * sn / 1.7;
	float v = x.y / den;
	vec2 g = vec2(x.x * (1.0 + v * sn / 1.7), v) + 0.5 + (w - 0.5) * u_melt * 0.5;
	vec2 cell = floor(g * 8.0);
	vec2 f = fract(g * 8.0) - 0.5;
	float inb = step(0.0, g.x) * step(g.x, 1.0) * step(0.0, g.y) * step(g.y, 1.0) * step(0.0, den);
	float gap = mix(0.075, 0.04, u_breath) + u_melt * 0.12;
	float rad = mix(0.14, 0.45, u_melt);
	vec2 dq = abs(f) - (vec2(0.5 - gap) - rad);
	float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - rad;
	float aa = 9.0 / u_board.z * (1.0 + u_board.w * 2.0);
	float tile = (1.0 - smoothstep(-aa, aa + u_melt * 0.4, sd)) * inb * (1.0 - smoothstep(0.55, 1.0, u_melt)) * (1.0 - u_hide);

	vec2 cd = (p - u_cursor.xy) / (mr * 0.22);
	float cl = exp(-dot(cd, cd)) * u_cursor.z;
	// the square colours cost a whole fbm; skip them wherever no square shows
	if (tile > 0.0) {
		float lite = 1.0 - mod(cell.x + cell.y, 2.0);
		float tn = fbm((cell + 0.5) / 8.0 * 2.4 + w * 0.7 + vec2(sl * 3.0, -sl * 2.0));
		float wave = 0.5 + 0.5 * sin(t * 0.8 - length(cell - vec2(4.0, 4.0)) * 0.9);
		float tv = (tn - 0.47) * 0.12;
		vec3 classic = lite > 0.5 ? pal(0.8 + drift * 0.3) * (1.05 + tv) : pal(0.18 + drift * 0.3) * (0.85 + tv);
		vec3 living = pal((tn - 0.15) / 0.6 + drift) * mix(0.58, 1.12, lite);
		vec3 tc = mix(classic, living, u_live) * (0.8 + 0.28 * u_breath) * (0.94 + 0.06 * wave);
		tc += smoothstep(-0.16, 0.0, sd) * 0.07 * (1.0 - u_melt);
		vec2 mk = g * 8.0 - vec2(u_mark.x + 0.5, 8.5 - u_mark.y);
		tc += u_glow * exp(-dot(mk, mk) * 1.6) * u_mark.z * 0.42;
		col = mix(col, tc * (1.0 + cl * 0.35), tile);
	}
	col += u_glow * (cl * 0.08 + ring * 0.07);

	vec2 vc = v_uv - 0.5;
	col *= 1.0 - dot(vc, vc) * 0.9;
	col += (hash(p + fract(t * 7.0) * 91.0) - 0.5) * 0.03;
	gl_FragColor = vec4(col, 1.0);
}
`;

export type Frame = {
	t: number; // flow clock, seconds
	b: number; // breath, 0 empty to 1 full
	x: number; // board center x, css px
	y: number; // board center y, css px
	s: number; // board side, css px
	k: number; // tilt, 0 flat to 1 lying back
	m: number; // melt, 0 crisp squares to 1 liquid
	h: number; // squares hidden, 0 shown to 1 gone
	l: number; // living colours, 0 classic two-tone squares to 1 flowing per-square colour
	p: Float32Array; // palette c0 c1 c2 c3 bg, rgb 0-1
	c: number[]; // cursor x, y, light strength
	q: number[]; // lit square file 0-7, rank 1-8, strength
};

export const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function make_field(canvas: HTMLCanvasElement) {
	const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
	if (!gl) return null;
	const hp = (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? 0) > 0;
	const compile = (type: number, src: string) => {
		const sh = gl.createShader(type)!;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
		console.warn(gl.getShaderInfoLog(sh));
		return null;
	};
	const vs = compile(gl.VERTEX_SHADER, VERT);
	const fs = compile(gl.FRAGMENT_SHADER, `precision ${hp ? 'highp' : 'mediump'} float;\n${FRAG}`);
	if (!vs || !fs) return null;
	const prog = gl.createProgram()!;
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
	gl.useProgram(prog);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const attr = gl.getAttribLocation(prog, 'a');
	gl.enableVertexAttribArray(attr);
	gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);

	const u = (n: string) => gl.getUniformLocation(prog, 'u_' + n);
	const at = { res: u('res'), time: u('time'), breath: u('breath'), board: u('board'), melt: u('melt'), hide: u('hide'), live: u('live'), c0: u('c0'), c1: u('c1'), c2: u('c2'), c3: u('c3'), bg: u('bg'), cursor: u('cursor'), mark: u('mark'), rip: u('rip[0]') };
	gl.uniform3fv(u('glow'), rgb('#e9a47c'));

	const rips: { x: number; y: number; t: number; a: number }[] = [];
	const rip = new Float32Array(24);
	let q = matchMedia('(pointer: coarse)').matches ? 0.55 : 0.8;
	let ema = 16.7;
	let last = 0;
	let count = 0;
	let lost = false;
	canvas.addEventListener('webglcontextlost', (e) => {
		e.preventDefault();
		lost = true;
		delete canvas.dataset.on;
	});

	function resize() {
		const r = Math.min(devicePixelRatio || 1, 1.5) * q;
		canvas.width = Math.max(1, Math.round(canvas.clientWidth * r));
		canvas.height = Math.max(1, Math.round(canvas.clientHeight * r));
		gl!.viewport(0, 0, canvas.width, canvas.height);
	}

	function draw(fr: Frame) {
		if (lost) return;
		const now = performance.now();
		const gap = now - last;
		last = now;
		if (gap < 100) {
			ema += (gap - ema) * 0.05;
			if (++count % 90 === 0 && ema > 24 && q > 0.4) {
				q = Math.max(0.4, q * 0.85);
				resize();
			}
		}
		while (rips.length && now - rips[0].t > 6000) rips.shift();
		for (let i = 0; i < 6; i++) {
			const r = rips[i];
			rip[i * 4] = r?.x ?? 0;
			rip[i * 4 + 1] = r?.y ?? 0;
			rip[i * 4 + 2] = r ? (now - r.t) / 1000 : 0;
			rip[i * 4 + 3] = r?.a ?? 0;
		}
		gl!.uniform2f(at.res, canvas.clientWidth, canvas.clientHeight);
		gl!.uniform1f(at.time, fr.t);
		gl!.uniform1f(at.breath, fr.b);
		gl!.uniform4f(at.board, fr.x, fr.y, Math.max(fr.s, 1), fr.k);
		gl!.uniform1f(at.melt, fr.m);
		gl!.uniform1f(at.hide, fr.h);
		gl!.uniform1f(at.live, fr.l);
		gl!.uniform3fv(at.c0, fr.p.subarray(0, 3));
		gl!.uniform3fv(at.c1, fr.p.subarray(3, 6));
		gl!.uniform3fv(at.c2, fr.p.subarray(6, 9));
		gl!.uniform3fv(at.c3, fr.p.subarray(9, 12));
		gl!.uniform3fv(at.bg, fr.p.subarray(12, 15));
		gl!.uniform3fv(at.cursor, fr.c);
		gl!.uniform3fv(at.mark, fr.q);
		gl!.uniform4fv(at.rip, rip);
		gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	}

	function ripple(x: number, y: number, a = 1) {
		rips.push({ x, y, t: performance.now(), a });
		if (rips.length > 6) rips.shift();
	}

	resize();
	return { draw, ripple, resize };
}
