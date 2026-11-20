// an account as the browser sees it: n name, p picture, m email, a when a grown-up said yes (ms), d created (ms)
export interface User {
	s: 'u';
	n: string;
	p?: string;
	m?: string;
	a?: number;
	d: number;
}
