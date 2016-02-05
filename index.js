#!/usr/bin/env node

// todo: pipes!

const CONTAINERS = {
  vek: {
    root: 'http://www.vek-dverey.ru/media',
    transforms: {
      square_200x200: 'convert {source} -resize 200x200 -background white -gravity center -extent 200x200 {destination}'
    }
  }
};

const PORT = 9988;
const STORAGE_ROOT = `${__dirname}/STORAGE`;

const mkdirp = require('mkdirp');
const http = require('http');
const request = require('request');
const fs = require('fs');
const path = require('path');
const nodeStatic = require('node-static');
require('shelljs/global');

mkdirp.sync(STORAGE_ROOT);

// request: {service_url}/vek/big/klin/impex1.png

var staticServer = new nodeStatic.Server(STORAGE_ROOT);

http.createServer(function(request, response) {
  request.addListener('end', function () {
    staticServer.serve(request, response, function (e, res) {
        if (e && (e.status === 404)) {
          try {
            var r = requestParser(request);
          } catch (err) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write('HTTP 404 - Not Found');
            response.end();
            return;
          }
          action(r, function(err) {
            if (err) {
              response.writeHead(404, {"Content-Type": "text/plain"});
              response.write('HTTP 404 - Not Found. (Request to origin error)');
              response.end();
            } else {
              relative = r.locals[r.transName].replace(STORAGE_ROOT, '');
              staticServer.serveFile(relative, 200, {}, request, response);
            }
          });
        }
    });
  }).resume();
}).listen(PORT);

function requestParser(request) {
  // requestInfo
  var r = {};

  var parts = request.url.split('/');
  r.container = parts[1];
  r.transName = parts[2];
  r.relativePath = '/' + parts.slice(3, parts.lenght).join('/');
  r.origin = CONTAINERS[r.container].root + r.relativePath;

  if (r.transName == 'origin') {
    r.transform = 'origin';
  } else {
    r.transform = CONTAINERS[r.container].transforms[r.transName];
  }

  if (!(r.container && r.transName && r.relativePath && r.transform)) {
    throw new Error();
  }

  r.locals = {};
  r.locals.origin = `${STORAGE_ROOT}/${r.container}/origin${r.relativePath}`;
  r.locals[r.transName] = `${STORAGE_ROOT}/${r.container}/${r.transName}${r.relativePath}`;

  return r;
}

function action(r, callback) {
  if (r.transName === 'origin') {
    getOrigin(r, callback);
  } else {
    getOrigin(r, function() {
      var source = r.locals.origin;
      var dest = r.locals[r.transName];
      var destDirname = path.dirname(dest);
      mkdirp.sync(destDirname);
      var transform = r.transform.replace('{source}', source).replace('{destination}', dest);
      console.log(transform);
      exec(transform);
      callback();
    });
  }
}

function getOrigin(r, callback) {
  if (fileExists(r.locals.origin)) {
    console.log('file exist');
    callback();
  } else {
    var dirname = path.dirname(r.locals.origin);
    mkdirp.sync(dirname);
    request
      .get(r.origin)
      //.on('response', function(response) {
      //  if (response.statusCode == 404) {
      //    //callback(404);
      //  }
      //})
      .pipe(fs.createWriteStream(r.locals.origin))
      .on('finish', callback)
  }
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}
