-- an account: one per google email
create table u (
	i text primary key, -- id
	e text not null unique, -- email
	n text not null, -- name
	p text, -- picture url
	a integer, -- when a grown-up said yes to keeping this account's data, ms; null until then
	g text, -- progress: puzzles, games and lessons, json (lib/progress.ts)
	d integer not null -- created, ms
);

-- a paystack payment, kept once: the reference is the key, so a repeated callback or webhook credits nothing
create table p (
	r text primary key, -- paystack reference
	u text not null, -- user id
	a integer not null, -- amount, kobo
	d integer not null -- when, ms
);
create index p_u on p (u);
