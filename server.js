/**
 * Custom replay server
 */

process.chdir(import.meta.dirname);

import express from 'express';
import fs from 'fs';
import path from 'path';
import cfg from './config.js';

const app = express();
const template = fs.readFileSync('template.html', { encoding: 'utf-8' });

// Small index means fresh in memory
const cache = [];

app.get('/:replay', (req, res) => {
	console.log(`${Date.now() / 1000} - ${req.params.replay}`);

	const [replay, api] = req.params.replay.split('.', 2);
	const parts = replay.split('-', 3);
	const id = `${parts[0]}-${parts[1]}`;
	const password = parts[2] ?? null;

	const i = cache.findIndex((x) => x.id === id);

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

	try {
		const data = JSON.parse(fs.readFileSync(path.normalize(`${cfg.replaysDir}/${replay}.json`), { encoding: 'utf-8' }));

		// Remember next time
		cache.unshift(data);
		if(cache.length > cfg.maxCache) cache.pop();

		// Access denied
		if(data.password !== password) {
			return;
		}

		send(res, data, api);
		return;
	}
	catch(e) {
		// Replay not saved or request invalid
		res.status(404).send();
		return;
	}
});

app.listen(cfg.port, () => {
	console.log('Replay server has started.');
});

function send(res, data, api) {
	api = api.toLowerCase();

	// These are not implemented
	data.formatid ??= data.id.split('-', 1)[0];
	data.views ??= 0;

	// JSON
	if(api === 'json') {
		res.json(data);
		return;
	}

	// log
	if(api === 'log') {
		res.send(data.log);
		return;
	}

	// default to HTML
	const scriptid = `replaylog-${data.id}${data.password ? `-${data.password}` : ''}`;
	let buf = template;
	buf = buf.replaceAll(
		'<!--$0-->',
		`<script type="text/plain" class="log" id="${scriptid}">\n` +
		data.log +
		'\n</script>'
	);
	buf = buf.replaceAll(
		'<!--$1-->',
		`<script type="application/json" class="data" id="${scriptid}">\n` +
		JSON.stringify(data) +
		'\n</script>'
	);
	res.send(buf);
}
