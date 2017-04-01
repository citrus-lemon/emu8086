// concatenate the library files to web-client
const modConcat = require("module-concat");
const outputFile = "./src/concatenated.js";
modConcat("./index.js", outputFile, function(err, stats) {
    if(err) throw err;
    console.log(stats.files.length + " were combined into " + outputFile);
});
