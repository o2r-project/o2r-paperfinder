"use strict"
const http = require('https');
const express = require('express');
const app = express();
const parseString = require('xml2js').parseString;

if (!process.env.DEBUG)
	process.env.DEBUG = "";
const debug = require('debug')('paperfinder');

// app.use(express.static(__dirname + '/public'));

var config = {
	inputFile: './paperURLs.json',
	publisherAPI: 'https://oai-pmh.copernicus.org/oai.php?',
	allJournalPath: 'verb=ListSets',
	journalPath: 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=',
	paperPath: 'verb=GetRecord&metadataPrefix=pmc&identifier=',
	categories: [
		'R', 'code', 'script', 'Python'
	]
};

//https://stackoverflow.com/questions/15376312/whats-the-simplest-way-to-parse-an-xml-string-in-node-js
function listJournals(url){
    var listSets = http.get(url, function (response) {
        var completeResponse = '';
        response.on('data', function (chunk) {
            completeResponse += chunk;
        });
        response.on('end', function() {
            parseString(completeResponse, function (err, result) {
                let journals = JSON.stringify(result["OAI-PMH"]["ListSets"][0].set);
                journals = JSON.parse(journals);
                listPapers(journals);
            });
        })
    }).on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });
}

function listPapers(journals){
    for(var i=0; i<journals.length;i++){
        let journal = journals[i].setSpec[0];
        var listSets = http.get(config.publisherAPI+config.journalPath+journals[i].setSpec[0], function (response) {
            var completeResponse = '';
            response.on('data', function (chunk) {
                completeResponse += chunk;
            });
            response.on('end', function() {
                parseString(completeResponse, function (err, result) {
                    debug('Finished with journal %s', journal);
                    if(result["OAI-PMH"]["ListIdentifiers"]!=undefined){
                        let papers = JSON.stringify(result["OAI-PMH"]["ListIdentifiers"][0].header);
                            papers = JSON.parse(papers);
                        requestPaper(papers);
                    }
                });
            })
        }).on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
    }
}

function requestPaper(papers){
    papers = cleanPapersData(papers);
    for(var i=0; i<papers.length;i++){
        var temp = config.publisherAPI+config.paperPath+papers[i].identifier[0];
        var paper = http.get(config.publisherAPI+config.paperPath+papers[i].identifier[0], function (response) {
            var completeResponse = '';
            response.on('data', function (chunk) {
                completeResponse += chunk;
            });
            response.on('end', function() {
                parseString(completeResponse, function (err, result) {
                    if(result!=undefined){
                        if(JSON.stringify(result["OAI-PMH"])!=undefined){
                            let paper = JSON.stringify(result["OAI-PMH"]);
                                paper = JSON.parse(paper);
                            assignPaper(paper);
                        }
                    }
                });
            })
        }).on('error', function (e) {
            debug('problem with request: $s at $t', e.message, temp);
        });
    }
}

function assignPaper(paper){
    if(getObjects(paper,'','python').length){
        console.log(paper.GetRecord[0].record[0].header[0].identifier)
    };
    if(paper.GetRecord!=undefined){
        if(paper.GetRecord[0].record!=undefined){
            if(paper.GetRecord[0].record[0].metadata!=undefined){
                if(paper.GetRecord[0].record[0].metadata[0].article!=undefined){
                    if(paper.GetRecord[0].record[0].metadata[0].article[0].body[0].sec!=undefined){
                        //console.log(paper.GetRecord[0].record[0].metadata[0].article[0].body[0].sec[1])
                        //console.log("###############################################################################################")
                    }
                    if(paper.GetRecord[0].record[0].metadata[0].article[0].front[0]["article-meta"][0].abstract!=undefined){
                        //console.log(paper.GetRecord[0].record[0].metadata[0].article[0].front[0]["article-meta"][0].abstract[0].p[0]=="");
                    }
                }
            }
        }
    }
}

//http://techslides.com/how-to-parse-and-search-json-in-javascript
//return an array of objects according to key, value, or key and value matching
function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else
        //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
        if (i == key && obj[i].toLowerCase().includes(val.toLowerCase()) || i == key && val == '') { //
            objects.push(obj);
        } else if (obj[i].toLowerCase().includes(val.toLowerCase()) && key == ''){
            //only add if the object is not already in the array
            if (objects.lastIndexOf(obj) == -1){
                objects.push(obj);
            }
        }
    }
    return objects;
}

//return an array of values that match on a certain key
function getValues(obj, key) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getValues(obj[i], key));
        } else if (i == key) {
            objects.push(obj[i]);
        }
    }
    return objects;
}

//return an array of keys that match on a certain value
function getKeys(obj, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getKeys(obj[i], val));
        } else if (obj[i] == val) {
            objects.push(i);
        }
    }
    return objects;
}

//example of grabbing obejcts that match some value in JSON
//console.log(getObjects(js,'','SG'));
//returns 2 object since 2 obects have keys with the value SGML

//Delete papers published before 1st December 2014 as they do not have full text support.
function cleanPapersData(papers){
    let before = papers.length;
    for(var i=0;i<papers.length;i++){
        let deadline = new Date(2014,11,1);
        let temp = papers[i].datestamp[0].split("-");
        let paperDate = new Date(temp[0],temp[1],temp[2]);
        //debug('paper is older: $s  ($t and $z)', paperDate<deadline, paperDate, deadline)
        if(paperDate<deadline){
            papers.splice(i,1);
        }
    }
    let after = papers.length;
    debug('Finished cleaning. Deleted $s of $t', after, before);
    return papers;
}

listJournals(config.publisherAPI+config.allJournalPath);
