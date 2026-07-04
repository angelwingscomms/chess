import { ImageResponse } from '@ethercorps/sveltekit-og';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const t = url.searchParams.get('t') || 'sonu';
  const html = `<div style="display:flex;flex-direction:column;width:100%;height:100%;background:#faf9f5;padding:80px;font-family:sans-serif;">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:auto;">
<span style="font-size:28px;color:#cc785c;font-weight:700;">sonu</span>
</div>
<h1 style="font-size:72px;color:#141413;margin:0 0 20px;line-height:1.1;font-weight:400;word-break:break-word;">${esc(t)}</h1>
<p style="font-size:28px;color:#6c6a64;margin:0;">Train chess with an AI coach that explains every move</p>
<div style="display:flex;align-items:center;gap:8px;margin-top:auto;border-top:4px solid #cc785c;padding-top:24px;">
<span style="font-size:20px;color:#141413;">chess.apexlinks.org</span>
</div>
</div>`;
  return new ImageResponse(html, { width: 1200, height: 630 });
};

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
