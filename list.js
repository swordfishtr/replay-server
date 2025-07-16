'use strict';

const queryform = document.getElementById('query-form');
const forceformat = document.getElementById('force-format');
const mindate = document.getElementById('min-date');
const maxdate = document.getElementById('max-date');
const limitresponses = document.getElementById('limit-responses');

const errormessage = document.getElementById('error-message');
const table = document.getElementById('table-body');

queryform.addEventListener('submit', async (event) => {
	event.preventDefault();

	errormessage.innerText = '';
	table.innerHTML = '';

	const format = forceformat.value;
	const minDate = ((new Date(mindate.value)).getTime() / 1000) || 0;
	const maxDate = ((new Date(maxdate.value)).getTime() / 1000) || 0;
	const limit = limitresponses.value;

	const params = new URLSearchParams({ format, minDate, maxDate, limit });
	const url = new URL(queryform.action);
	url.search = params;

	console.log(url);

	const res = await fetch(url);
	if(!res.ok) {
		errormessage.innerText = 'Failed to fetch replay data.';
		return;
	}

	const data = await res.json();
	if(!Array.isArray(data)) {
		errormessage.innerText = 'Received invalid replay data.';
		return;
	}
	if(!data.length) {
		errormessage.innerText = 'No replays found.';
		return;
	}

	console.log(data);

	table.innerHTML = genTable(data);
});

// Get latest replays on load
queryform.dispatchEvent(new Event('submit', { cancelable: true }));

function genTable(data) {
	return data
	.map((replay, i) => {
		let buf = '<tr>';

		// Entry
		buf += `<td>${i + 1}</td>`;

		// Timestamp
		buf += `<td>${replay.uploadtime}</td>`;

		// Link
		buf += `<td><a href="https://replay.generationssd.co.uk/${replay.id}">${replay.id}</a></td>`;

		// Rating (bugged)
		//buf += `<td>${replay.rating ?? 'Unrated'}</td>`;

		// Private
		buf += `<td>${Boolean(replay.private)}</td>`;

		// Players
		buf += `<td>${replay.players[0] ?? '-'}</td>`;
		buf += `<td>${replay.players[1] ?? '-'}</td>`;
		buf += `<td>${replay.players[2] ?? '-'}</td>`;
		buf += `<td>${replay.players[3] ?? '-'}</td>`;

		buf += '</tr>';
		return buf;
	})
	.join('');
}
