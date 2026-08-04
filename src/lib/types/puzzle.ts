export type Puzzle = {
	p: string;
	f: string;
	m: string;
	r: number;
	v: number;
	u: string;
	t: string[];
};

export type PuzzleQuery = {
	t?: string[];
	any?: string[];
	r_min?: number;
	r_max?: number;
	v_min?: number;
	n?: number;
	after?: number;
};

export const PUZZLE_THEMES = [
	'advancedPawn', 'advantage', 'anastasiaMate', 'arabianMate', 'attackingF2F7', 'attraction',
	'backRankMate', 'balestraMate', 'bishopEndgame', 'blindSwineMate', 'bodenMate',
	'capturingDefender', 'castling', 'clearance', 'collinearMove', 'cornerMate', 'crushing',
	'defensiveMove', 'deflection', 'discoveredAttack', 'discoveredCheck', 'doubleBishopMate',
	'doubleCheck', 'dovetailMate', 'enPassant', 'endgame', 'epauletteMate', 'equality',
	'exposedKing', 'fork', 'hangingPiece', 'hookMate', 'interference', 'intermezzo',
	'killBoxMate', 'kingsideAttack', 'knightEndgame', 'long', 'master', 'masterVsMaster', 'mate',
	'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5', 'middlegame', 'morphysMate',
	'oneMove', 'opening', 'operaMate', 'pawnEndgame', 'pillsburysMate', 'pin', 'promotion',
	'queenEndgame', 'queenRookEndgame', 'queensideAttack', 'quietMove', 'rookEndgame',
	'sacrifice', 'short', 'skewer', 'smotheredMate', 'superGM', 'swallowstailMate',
	'trappedPiece', 'triangleMate', 'underPromotion', 'veryLong', 'vukovicMate', 'xRayAttack',
	'zugzwang'
] as const;

export const PUZZLE_EXTRA_TAGS = [
	'rating_beginner', 'rating_easy', 'rating_intermediate', 'rating_advanced', 'rating_expert',
	'rating_master', 'solve_white', 'solve_black', 'popular'
] as const;

export const PUZZLE_TOOL_DESCRIPTION = `Search 6 million lichess tactics puzzles by tag and rating. Returns each puzzle's FEN (the exact position the user solves from) and its solution moves in UCI. After finding one, load it on the board with set_state using the returned fen.

Tags in "t" must ALL match; tags in "any" match if at least one does. Available tags:
themes: ${PUZZLE_THEMES.join(', ')}
difficulty: rating_beginner (<1200), rating_easy, rating_intermediate, rating_advanced, rating_expert, rating_master (2400+)
side to move: solve_white, solve_black
quality: popular
openings: lichess opening names with underscores, e.g. Sicilian_Defense, Italian_Game, French_Defense, Ruy_Lopez, Queens_Gambit_Declined

Note "master" is a theme meaning the game was played by a titled player — use rating_master for difficulty.`;
