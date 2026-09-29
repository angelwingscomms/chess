-- a session: one game and the chat about it
create table s (
	i text primary key, -- id
	u text not null, -- user id
	t text not null, -- title, from the game
	p text not null, -- preview: the first thing the player asked
	f text not null, -- board position (fen), for the little board
	d integer not null, -- last change, ms
	b text not null -- body: board and chat, json
);
create index s_u on s (u, d desc);
