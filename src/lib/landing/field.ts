const VERT = 'attribute vec2 a;varying vec2 v_uv;void main(){v_uv=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}';

const HASH = `
float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}
`;

// the slow noise, drawn into a tiny texture: it is soft, so ~96 texels across the short side look the same as full res
const FLOW = `
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_melt;
${HASH}
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

void main() {
	vec2 s = vec2(v_uv.x, 1.0 - v_uv.y) * u_res / min(u_res.x, u_res.y) * 1.6;
	float sl = u_time * 0.02;
	vec2 w = vec2(fbm(s + vec2(0.0, sl)), fbm(s + vec2(5.2, 1.3 - sl)));
	gl_FragColor = vec4(w, fbm(s + (1.4 + u_melt * 1.8) * w + vec2(sl * 0.7, 1.7)), 1.0);
}
`;

const FRAG = `
varying vec2 v_uv;
uniform sampler2D u_flow;
uniform vec2 u_res;
uniform float u_time;
uniform float u_breath;
uniform vec4 u_board;
uniform float u_melt;
uniform float u_hide;
uniform float u_live;
uniform float u_light;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;
uniform vec3 u_glow;
uniform vec3 u_cursor;
uniform vec3 u_mark;
uniform vec4 u_rip[6];
${HASH}
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

	vec3 fl = texture2D(u_flow, vec2(q.x, u_res.y - q.y) / u_res).rgb;
	vec2 w = fl.xy;
	float n = fl.z;
	float drift = 0.1 * sin(t * 0.05);
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
	if (tile > 0.0) {
		float lite = 1.0 - mod(cell.x + cell.y, 2.0);
		// each square takes its colour from one spot of the flow, so it drifts with it
		float tn = texture2D(u_flow, (cell + 0.5) / 10.0 + 0.1).b;
		float wave = 0.5 + 0.5 * sin(t * 0.8 - length(cell - vec2(4.0, 4.0)) * 0.9);
		float tv = (tn - 0.47) * 0.12;
		vec3 classic = lite > 0.5 ? pal(0.8 + drift * 0.3) * (mix(1.05, 0.92, u_light) + tv) : pal(0.18 + drift * 0.3) * (mix(0.85, 0.9, u_light) + tv);
		vec3 living = pal((tn - 0.15) / 0.6 + drift) * mix(mix(0.58, 0.86, u_light), mix(1.12, 1.0, u_light), lite);
		vec3 tc = mix(classic, living, u_live) * mix(0.8 + 0.28 * u_breath, 0.97 + 0.05 * u_breath, u_light) * (0.94 + 0.06 * wave);
		tc += smoothstep(-0.16, 0.0, sd) * mix(0.07, -0.05, u_light) * (1.0 - u_melt);
		vec2 mk = g * 8.0 - vec2(u_mark.x + 0.5, 8.5 - u_mark.y);
		float mg = exp(-dot(mk, mk) * 1.6) * u_mark.z;
		tc += u_glow * mg * 0.42 * (1.0 - u_light);
		tc = mix(tc, u_glow, mg * 0.4 * u_light);
		col = mix(col, tc * (1.0 + cl * mix(0.35, -0.08, u_light)), tile);
	}
	float lit = cl * 0.08 + ring * 0.07;
	col += u_glow * lit * (1.0 - u_light);
	col = mix(col, u_glow, lit * 0.9 * u_light);

	vec2 vc = v_uv - 0.5;
	col *= 1.0 - dot(vc, vc) * mix(0.9, 0.16, u_light);
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
	d?: number; // theme, 0 dark (the default) to 1 light
	p: Float32Array; // palette c0 c1 c2 c3 bg, rgb 0-1
	c: number[]; // cursor x, y, light strength
	q: number[]; // lit square file 0-7, rank 1-8, strength
};

export const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export function make_field(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
	if (!ctx) return null;
	const gl = ctx;
	const hp = (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? 0) > 0;
	const compile = (type: number, src: string) => {
		const sh = gl.createShader(type)!;
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
		console.warn(gl.getShaderInfoLog(sh));
		return null;
	};
	const link = (src: string) => {
		const vs = compile(gl.VERTEX_SHADER, VERT);
		const fs = compile(gl.FRAGMENT_SHADER, `precision ${hp ? 'highp' : 'mediump'} float;\n${src}`);
		if (!vs || !fs) return null;
		const prog = gl.createProgram()!;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.bindAttribLocation(prog, 0, 'a');
		gl.linkProgram(prog);
		return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
	};
	const prog = link(FRAG);
	const flow_prog = link(FLOW);
	if (!prog || !flow_prog) return null;
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	const flow_tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, flow_tex);
	for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
	const fbo = gl.createFramebuffer();
	let fw = 1;
	let fh = 1;
	let css_w = 1;
	let css_h = 1;

	const u = (n: string) => gl.getUniformLocation(prog, 'u_' + n);
	const at = { res: u('res'), time: u('time'), breath: u('breath'), board: u('board'), melt: u('melt'), hide: u('hide'), live: u('live'), light: u('light'), glow: u('glow'), c0: u('c0'), c1: u('c1'), c2: u('c2'), c3: u('c3'), bg: u('bg'), cursor: u('cursor'), mark: u('mark'), rip: u('rip[0]') };
	const fu = (n: string) => gl.getUniformLocation(flow_prog, 'u_' + n);
	const fat = { res: fu('res'), time: fu('time'), melt: fu('melt') };
	const coral = rgb('#e9a47c');
	const clay = rgb('#c8603a');

	const rips: { x: number; y: number; t: number; a: number }[] = [];
	const rip = new Float32Array(24);
	// html.lite (app.css) drops the per-frame shadows and blur: phones with 4 GB or less start there, slow ones drop to it
	const root = document.documentElement;
	if (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4) root.classList.add('lite');
	let q = root.classList.contains('lite') ? 0.45 : matchMedia('(pointer: coarse)').matches ? 0.55 : 0.8;
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
		css_w = canvas.clientWidth;
		css_h = canvas.clientHeight;
		const r = Math.min(devicePixelRatio || 1, 1.5) * q;
		canvas.width = Math.max(1, Math.round(css_w * r));
		canvas.height = Math.max(1, Math.round(css_h * r));
		const k = 96 / Math.max(1, Math.min(css_w, css_h));
		fw = Math.max(1, Math.ceil(css_w * k));
		fh = Math.max(1, Math.ceil(css_h * k));
		gl.bindTexture(gl.TEXTURE_2D, flow_tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fw, fh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flow_tex, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	function draw(fr: Frame, track = false) {
		if (lost) return;
		const now = performance.now();
		// Idle and deliberately capped frames don't measure what the device can draw.
		const gap = track && last ? now - last : 0;
		last = track ? now : 0;
		if (gap > 0 && gap < 200) {
			ema += (gap - ema) * 0.05;
			if (++count % 90 === 0 && ema > 24) {
				root.classList.add('lite');
				if (q > 0.4) {
					q = Math.max(0.4, Math.min(0.45, q * 0.85));
					resize();
				}
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
		gl.useProgram(flow_prog);
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.viewport(0, 0, fw, fh);
		gl.uniform2f(fat.res, css_w, css_h);
		gl.uniform1f(fat.time, fr.t);
		gl.uniform1f(fat.melt, fr.m);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.useProgram(prog);
		gl.uniform2f(at.res, css_w, css_h);
		gl.uniform1f(at.time, fr.t);
		gl.uniform1f(at.breath, fr.b);
		gl.uniform4f(at.board, fr.x, fr.y, Math.max(fr.s, 1), fr.k);
		gl.uniform1f(at.melt, fr.m);
		gl.uniform1f(at.hide, fr.h);
		gl.uniform1f(at.live, fr.l);
		const d = fr.d ?? 0;
		gl.uniform1f(at.light, d);
		gl.uniform3f(at.glow, coral[0] + (clay[0] - coral[0]) * d, coral[1] + (clay[1] - coral[1]) * d, coral[2] + (clay[2] - coral[2]) * d);
		gl.uniform3fv(at.c0, fr.p.subarray(0, 3));
		gl.uniform3fv(at.c1, fr.p.subarray(3, 6));
		gl.uniform3fv(at.c2, fr.p.subarray(6, 9));
		gl.uniform3fv(at.c3, fr.p.subarray(9, 12));
		gl.uniform3fv(at.bg, fr.p.subarray(12, 15));
		gl.uniform3fv(at.cursor, fr.c);
		gl.uniform3fv(at.mark, fr.q);
		gl.uniform4fv(at.rip, rip);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	function ripple(x: number, y: number, a = 1) {
		rips.push({ x, y, t: performance.now(), a });
		if (rips.length > 6) rips.shift();
	}

	resize();
	return { draw, ripple, resize };
}
