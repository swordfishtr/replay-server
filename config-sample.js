export default {

	/** Port to listen on, 0 to leave the decision to system. */
	port: 3000,

	/** Path of (symlink to) directory holding replays. */
	replaysDir: '',

	/** Path of (symlink to) replay.pokemonshowdown.com */
	portalDir: '',

	/**
	 * Number of replays to keep in memory after reading from from the filesystem.
	 * Some replays have more demand (e.g. tour matches) and this skips reading and parsing.
	 * 
	 * Assume every replay is 100kb.
	 */
	maxCache: 1000,

}
