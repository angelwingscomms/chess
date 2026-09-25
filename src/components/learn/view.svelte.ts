import type { View } from '$lib/board3d/scene';

export const cam = $state({ v: 'p' as View | '', on: false, gl: true, out: false });

export function load_view() {
	try {
		const v = localStorage.getItem('e4_view');
		if (v === 't' || v === 'p' || v === 'l' || v === 's') cam.v = v;
	} catch {}
}

export function set_view(v: View) {
	cam.v = v;
	try {
		localStorage.setItem('e4_view', v);
	} catch {}
}
