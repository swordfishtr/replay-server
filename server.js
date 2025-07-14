/**
 * Custom replay server
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import cfg from './config.js';

const app = express();
const testclient = path.resolve('./portal/replay.pokemonshowdown.com/testclient.html');

// Small index means fresh in memory
const cache = [];

app.use('/portal', express.static('portal'));

// Requests for replays list
app.get('/', (req, res) => {
	res.sendFile(path.resolve('./list.html'));
});

// Requests for a replay
app.get('/:replay', (req, res) => {
	console.log(`${parseInt(Date.now() / 1000)} - ${req.params.replay}`);

	const [replay, api] = req.params.replay.split('.', 2);
	const parts = replay.split('-', 3);
	const id = `${parts[0]}-${parts[1]}`;
	const password = parts[2] ?? null;

	const i = cache.findIndex((x) => x.id === id);

	// Exists in cache
	if(i > -1) {
		// Keep it fresh
		if(i !== 0) cache.unshift(cache.splice(i, 1)[0]);

		// Access denied
		if(cache[i].password !== password) {
			res.status(403).send('Password incorrect.');
			return;
		}

		send(res, cache[i], api);
		return;
	}

	// Doesn't exist in cache
	try {
		const data = JSON.parse(fs.readFileSync(path.normalize(`${cfg.replaysDir}/${replay}.json`), { encoding: 'utf-8' }));

		// Remember next time
		cache.unshift(data);
		if(cache.length > cfg.maxCache) cache.pop();

		// Access denied
		if(data.password !== password) {
			res.status(403).send('Password incorrect.');
			return;
		}

		send(res, data, api);
		return;
	}
	catch(e) {
		// Replay not saved
		res.status(404).send();
		return;
	}
});

// Requests for background image
app.get('/images/:img', (req, res) => {
	const target = req.params.img.replaceAll('..', '');
	res.sendFile(path.resolve(target));
});

app.listen(cfg.port, () => {
	console.log('Replay server has started.');
});

function send(res, data, api) {
	api = api?.toLowerCase();

	// These are not implemented
	data.formatid ??= data.id.split('-', 1)[0];
	data.views ??= 0;

	// json
	if(api === 'json') {
		res.json(data);
		return;
	}

	// log
	if(api === 'log') {
		res.send(data.log);
		return;
	}

	// html
	if(api === undefined) {
		res.sendFile(testclient);
		return;
	}

	// not something we support
	res.status(400).send();
}
