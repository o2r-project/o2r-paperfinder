var pdfText=require('pdf-text');
var fs=require('fs');
var url=require('url');
var https=require("https");
var download=require('download');
var urls=require('./paperURLs.json');
var debug=require('debug')('paperURLs');
var async= require("async");

DOWNLOAD_DIR = './paper/';

var temp=0;
function readFile(callback) {
	download(urls[temp], './paper')
	    .then(function(content){
			console.log("next");
			temp++;
			if(temp<urls.length){
				readFile(callback);
			}
	    })
	    .catch(function(err){
	        console.log(err.stack);
	    });
}

readFile();


//Alternative with https
//Error: Unable to verify first certificate
//Sometimes download works but PDF is broken.
/*
function readFile(callback) {
	if(urls.length > 0) {
    	var setFile = urls.shift(),
     	file_name = url.parse(setFile).pathname.split('/').pop(),
     	trial = setFile.split('/').pop(),
     	file = fs.createWriteStream(DOWNLOAD_DIR + trial);
	 	https.get(setFile, function(res) {
		 	res.on('error', function(err) {
		    	console.log(err);
		  	});
		  	res.pipe(file).on('close', function() {
				console.log(setFile + ' completed, moving on');
		    	readFile(callback);
		  	});
		});
  	} 
}

 readFile();
*/

//https://github.com/brianc/node-pdf-text 
/*function assignPapers(){
	for(i=0;i<fileNames.length;i++){
		var buffer = fs.readFileSync(pathToPdf+pdfName);
		pdfText(buffer, function(err, chunks) {

		});
		console.log(fs.existsSync(pathToPdf+pdfName));
		pdfText(buffer, function(err, chunks) {
			for(i=0; i<chunks.length; i++){
				if(chunks[i]=="R"){
					if (!fs.existsSync(".paper/R")){
						fs.mkdirSync(".paper/R");
					}
					fs.createReadStream(pathToPdf+pdfName).pipe(fs.createWriteStream('code/'+pdfName));
				}else if(chunks[i]=="Python" || chunks[i]=="python"){
					if (!fs.existsSync(".paper/Python")){
						fs.mkdirSync(".paper/Python");
					}				
				}else if(chunks[i].includes("script")){
					if (!fs.existsSync(".paper/script")){
						fs.mkdirSync(".paper/script");
					}				
				}else if(chunks[i].includes("code")){
					if (!fs.existsSync(".paper/code")){
						fs.mkdirSync(".paper/code");
					}				
					}		
			}
		});
	}
};*/