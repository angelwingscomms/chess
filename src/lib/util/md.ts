import { Marked } from 'marked';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// the coach's markdown: any html it writes shows as text and only web links stay links, so a reply can never run code
export const md = new Marked({
	renderer: {
		html: ({ text }) => esc(text),
		link({ href, tokens }) {
			const t = this.parser.parseInline(tokens);
			return /^https?:\/\//i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noreferrer">${t}</a>` : t;
		},
		image: ({ text }) => esc(text)
	}
});
