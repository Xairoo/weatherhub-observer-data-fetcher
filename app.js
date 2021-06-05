const qs = require('querystring');
const https = require('https');
const libCookie = require('cookie');
const setCookie = require('set-cookie-parser');
const csv = require('@fast-csv/parse');

require('dotenv').config();

const devices = ['090005AC99E2']; // Add your device IDs
const total_rows = 1; // How many rows should be processed? Min. must be 1
const interval = 60; // Time between a new fetch run, default is `60`

var auth_cookie;

const login = async () => {
	return new Promise((resolve, reject) => {
		const postData = qs.stringify({
			Username: process.env.AUTH_USERNAME,
			Password: process.env.AUTH_PASSWORD,
		});

		const options = {
			hostname: 'www.wh-observer.de',
			port: 443,
			path: '/Account/LogOn',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			},
		};

		const req = https.request(options, (res) => {
			if (res.headers['set-cookie']) {
				const cookies = setCookie.parse(res, {
					decodeValues: true,
				});

				cookies.forEach((cookie) => {
					if (cookie.name === '.ASPXAUTH' && cookie.value !== '') {
						// Set the auth_cookie
						auth_cookie = cookie;
					}
				});

				if (!auth_cookie) {
					console.log('login failed');
					auth_cookie = '';
					reject();
					return;
				}
			} else {
				console.log('login failed');
				auth_cookie = '';
				reject();
				return;
			}

			resolve();
			return;
		});

		req.on('error', (err) => {
			// console.log(err);
			console.log('login failed');
			auth_cookie = '';
			reject();
		});

		req.write(postData);
		req.end();
	});
};

const getData = async (device_id) => {
	return new Promise(async (resolve, reject) => {
		// Try to get a new cookie
		if (!auth_cookie) {
			try {
				await login();
			} catch (err) {
				// console.log(err);
			}

			// Didn't worked? Just wait until the next cycle
			if (!auth_cookie) {
				reject();
				return;
			}
		}

		const cookie = libCookie.serialize(auth_cookie.name, auth_cookie.value, auth_cookie);

		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		const fromDate =
			('0' + (today.getMonth() + 1)).slice(-2) +
			'/' +
			('0' + today.getDate()).slice(-2) +
			'/' +
			today.getFullYear();

		const toDate =
			('0' + (tomorrow.getMonth() + 1)).slice(-2) +
			'/' +
			('0' + tomorrow.getDate()).slice(-2) +
			'/' +
			tomorrow.getFullYear();

		const options = {
			hostname: 'www.wh-observer.de',
			port: 443,
			path:
				'/DeviceDetails/DataCSV?deviceID=' +
				device_id +
				'&from=' +
				fromDate +
				'&to=' +
				toDate +
				'&detailLevel=day',
			method: 'GET',
			headers: {
				Cookie: cookie,
			},
		};

		const req = https.request(options, async (res) => {
			var body = '';
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				body += chunk;
			});

			res.on('end', () => {
				const lines = body.split(/\r\n|\r|\n/).length;
				const limit = total_rows + 2; // Add 2 rows because of header and the last empty line
				const skip_lines = lines - limit >= limit ? lines - limit : 0; // Get only the last row
				let data = [];

				csv.parseString(body, {
					headers: (headers) => headers.map((h) => h?.split(' ').join('_').toLowerCase()),
					delimiter: ';',
					strictColumnHandling: true,
					skipRows: skip_lines,
					ignoreEmpty: true,
				})
					.on('error', (err) => {
						console.log(err);
						reject();
						return;
					})
					.on('data', (row) => {
						let i = 0;
						for (const key in row) {
							if (i++ === 0) {
								row[key] = new Date(row[key]);
							} else {
								row[key] = Number(row[key]) ? Number(row[key]) : row[key];
							}
						}

						data.push(row);
						//
						// Send the current `row` to MySQL, MongoDB, Redis, ...
						// or send using websocket to your weather station
						//
					})
					.on('end', (row_count) => {
						console.log(data);
						//
						// Send the fetched `data` to MySQL, MongoDB, Redis, ...
						// or send using websocket to your weather station
						// `fetchedData` containes the full
						//
						resolve();
						return;
					});
			});
		});

		req.on('error', (e) => {
			console.log(e);
			reject();
			return;
		});

		req.end();
	});
};

var loop_timeout;

const app = async () => {
	clearTimeout(loop_timeout);
	try {
		for (const device_id of devices) {
			await getData(device_id);
		}
	} catch (err) {
		// console.log(err);
	}

	loop_timeout = setTimeout(app, interval * 1000);
};

app();
