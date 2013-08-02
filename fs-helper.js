var async = require("async"),
    path = require("path"),
    fs = require("fs"),
    exec = require("child_process").exec;

var tempFiles = [], tempDirs = [];
function registerTempFile(filename) {
  tempFiles.push(filename);
}

function createTempFile(filename, content) {
  fs.writeFileSync(filename, content);
  registerTempFile(filename);
  console.log('created ' + filename);
  return filename;
}

function createTempDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  console.log('Created ' + dir);
  tempDirs.unshift(dir);
}

function cleanupTempFiles(thenDo) {
  async.series(
    tempFiles.map(function(file) {
      return function(cb) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        else console.warn('trying to cleanup file %s but it did not exist', file);
        cb();
      };
    }).concat(tempDirs.map(function(dir) {
      return function(cb) {
        exec('rm -rfd ' + dir, function(code, out, err) { cb(); });
      }
    })),
    function() {
      tempFiles = [];
      tempDirs = [];
      thenDo && thenDo();
    }
  )
}

function createDirStructure(basePath, spec, thenDo) {
  // spec is an object like
  // {"foo": {"bar.js": "bla"}}
  // will create dir "foo/" and file foo/bar.js with "bla" as content
  for (var name in spec) {
    var p = path.join(basePath, name);
    if (typeof spec[name] === 'string') {
      createTempFile(p, spec[name]);
      continue;
    }
    if (typeof spec[name] === 'object') {
      createTempDir(p);
      createDirStructure(p, spec[name]);
      continue;
    }
  }
  thenDo && thenDo();
}

module.exports = {
    registerTempFile: registerTempFile,
    createTempFile: createTempFile,
    cleanupTempFiles: cleanupTempFiles,
    createDirStructure: createDirStructure
}
