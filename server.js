/**
 * Custom replay server
 */

'use strict';

import express from 'express';
import fs from 'fs';
import path from 'path';
import cfg from './config.js';

const ERR403 = (id) => `Password incorrect. If you lost it, login on the server and send /accessreplay https://replay.generationssd.co.uk/${id}`;

const app = express();
const replays = path.resolve(cfg.replaysDir);
// const portal = path.resolve(cfg.portalDir);
const listclient = path.resolve('./list.html');
const testclient = path.resolve('./portal/replay.pokemonshowdown.com/testclient.html');

// Storing popular replays including log and inputlog for faster access.
// Small index means fresh in memory.
const cacheFiles = [];

// Storing all replays excluding log and inputlog for faster access.
// Updates as files get created or updated.
const cacheMetadata = {};
for(const file of fs.readdirSync(replays)) {
	if(!file.endsWith('.json')) continue;
	cacheMetadataAdd(file);
}
fs.watch(replays, 'utf-8', function(event, filename) {
	// this fires rename on file create, and then change on data write.
	if(event !== 'change') return;

	// A replay (possibly existing) has been updated.
	if(filename?.endsWith('.json')) {
		cacheMetadataAdd(filename);
	}

	// Check that we're not missing anything else (maybe filename was not provided).
	for(const file of fs.readdirSync(replays)) {
		if(!file.endsWith('.json') || file.slice(0,-5) in cacheMetadata) continue;
		cacheMetadataAdd(file);
	}

	// Now we're not covering the case of an existing replay being updated with no filename provided.
	// But we can't read and parse all replays every time one is uploaded, which would be the only way to cover this case.
});

// Requests for files in replay.pokemonshowdown.com
app.use('/portal', express.static('portal'));

// Hardcoded responses
app.get('/images/bg-starfield.jpg', (req, res) => {
	res.sendFile('./portal/replay.pokemonshowdown.com/images/bg-starfield.jpg');
});
app.get('/favicon.ico', (req, res) => {
	res.sendFile('./portal/play.pokemonshowdown.com/favicon-32.png');
});

// Requests for replays list client
app.get('/', (req, res) => {
	res.sendFile(listclient);
});

// Requests for batch replay metadata
app.get('/api', (req, res) => {
	// This should return an array of objects containing replay id, players, date, rank, and whether replay is password protected.
	try { console.log(req.query); }
	catch { console.log('req.query error'); }

	// Max number of replays to return
	const limit = Math.min(
		(typeof req.query.limit === 'string' ? (parseInt(req.query.limit) || 100) : 100),
		200
	);

	// Earliest the replay dates should be
	const minDate = typeof req.query.minDate === 'string' ? (parseInt(req.query.minDate) || 0) : 0;

	// Latest the replay dates should be - 0 or less means no limit
	const maxDate = typeof req.query.maxDate === 'string' ? (parseInt(req.query.maxDate) || 0) : 0;

	let results = Object.entries(cacheMetadata);
	if(minDate !== 0) results = results.filter(([id, data]) => data.uploadtime >= minDate);
	if(maxDate !== 0) results = results.filter(([id, data]) => data.uploadtime <= maxDate);

	// hardcoded sort for now
	results.sort(([id1, data1], [id2, data2]) => data1.uploadtime - data2.uploadtime);
	results.reverse();

	if(results.length > limit) results = results.slice(0, limit);

	results = results.map(([id, data]) => ({ id, ...data }));

	res.json(results);
});

// Requests for a replay
app.get('/:replay', (req, res) => {
	console.log(`${parseInt(Date.now() / 1000)} - ${req.params.replay}`);

	const [replay, api] = req.params.replay.split('.', 2);
	const parts = replay.split('-', 3);
	const id = `${parts[0]}-${parts[1]}`;
	const password = parts[2] ?? null;

	const i = cacheFiles.findIndex((x) => x.id === id);

	// Exists in cacheFiles
	if(i > -1) {
		// Keep it fresh
		if(i !== 0) cacheFiles.unshift(cacheFiles.splice(i, 1)[0]);

		// Access denied
		if(cacheFiles[0].password !== password) {
			res.status(403).send(ERR403(id));
			return;
		}

		send(res, cacheFiles[0], api);
		return;
	}

	// Doesn't exist in cacheFiles
	try {
		// TODO: utilize cacheMetadata here

		const data = JSON.parse(fs.readFileSync(path.normalize(`${replays}/${id}.json`), { encoding: 'utf-8' }));

		// Remember next time
		cacheFiles.unshift(data);
		if(cacheFiles.length > cfg.maxCache) cacheFiles.pop();

		// Access denied
		if(cacheFiles[0].password !== password) {
			res.status(403).send(ERR403(id));
			return;
		}

		send(res, data, api);
		return;
	}
	catch {
		// Replay not saved
		res.status(404).send();
		return;
	}
});

// Start serving
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

function cacheMetadataAdd(filename) {
	const data = JSON.parse(fs.readFileSync(`${replays}/${filename}`, { encoding: 'utf-8' }));
	delete data.id;
	delete data.password;
	delete data.log;
	delete data.inputlog;
	cacheMetadata[filename.slice(0,-5)] = data;
}
