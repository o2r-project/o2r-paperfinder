/*
 * (C) Copyright 2017 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const extract = require('pdf-text-extract');
const fs = require('fs');
const url = require('url');
const https = require('https');
const download = require('download');
const async = require('async');
const filesize = require('filesize');
const filenamifyUrl = require('filenamify-url');
const path = require('path');

// https://stackoverflow.com/a/32440021/261210
var sslRootCAs = require('ssl-root-cas/latest');
sslRootCAs.inject();

// This makes the whole thing quite insecure:
//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

if (!process.env.DEBUG)
	process.env.DEBUG = "*";
const debug = require('debug')('paperfinder');

var config = {
	inputFile: './paperURLs.json',
	downloadDir: './paper/',
	categories: [
		'R', 'code', 'script', 'Python'
	]
}

// create needed output dirs
if (!fs.existsSync(config.downloadDir))
	fs.mkdirSync(config.downloadDir);
config.categories.forEach(cat => {
	let catPath = path.join(config.downloadDir, cat);
	if (!fs.existsSync(catPath))
		fs.mkdirSync(catPath);
	debug('Created category directory %s', catPath);
});

function downloadPapers(inputFile) {
	let urls = require(inputFile);
	debug('Starting download of %s URLs loaded from %s', urls.length, inputFile);

	Promise.all(urls.map(item => downloadAndProcess(item, './paper')))
		.catch(err => {
			debug('A promise was rejected: %s', err);
			process.exit();
		})
		.then((values) => {
			let downloaded = values.filter(item => { return (!(item instanceof Error)) })
			let matchesCount = values.reduce((current, item)=> {
				if (item.matches) {
					return current + item.matches.length;
				}
			}, 0);

			debug('%s URLs processed, %s downloaded, %s categories matched.', values.length, downloaded.length, matchesCount);
			process.exit();
		});
}

function processFile(file, resolve) {
	extract(file, function (err, pages) {
		if (err) {
			console.dir(err)
			resolve(err);
		}
		debug('Read %s pages from file %s', pages.length, file);

		let matches = [];

		for (i = 0; i < pages.length; i++) {
			if (pages[i] == "R") {
				addFileToCategory(file, 'R');
				matches.push('R');
			} else if (pages[i] == "Python" || pages[i] == "python") {
				addFileToCategory(file, 'Python');
				matches.push('Python');
			} else if (pages[i].includes("script")) {
				addFileToCategory(file, 'script');
				matches.push('script');
			} else if (pages[i].includes("code")) {
				addFileToCategory(file, 'code');
				matches.push('code');
			}
		}

		resolve({ file: file, matches: matches });
	});
}

function downloadAndProcess(url, targetPath) {
	return new Promise((resolve, reject) => {
		let fileName = filenamifyUrl(url);
		let filePath = path.join(targetPath, fileName)

		if (fs.existsSync(filePath)) {
			debug('File %s already exists!', filePath);
			processFile(filePath, resolve);
		} else {
			debug('Download %s', url);

			download(url, config.downloadDir, { filename: fileName })
				.then(() => {
					debug('Downloaded URL %s to file %s (%s)', url, filePath, filesize(file.statSync(filePath).size));
					processFile(filePath, resolve);
				})
				.catch(function (err) {
					debug('ERROR downloading %s: %s', url, err);
					resolve(err);
				});
		}
	});
}

function addFileToCategory(file, category) {
	let outputFile = path.join(config.downloadDir, category, path.basename(file));
	debug('Copying file %s to %s', file, outputFile);
	fs.createReadStream(file).pipe(fs.createWriteStream(outputFile));
}

// https://stackoverflow.com/a/14387791/261210
function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on("error", function (err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function (err) {
		done(err);
	});
	wr.on("close", function (ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

downloadPapers(config.inputFile);
