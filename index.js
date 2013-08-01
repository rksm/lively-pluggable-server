var debug = false,
    defaultPort = 9003,
    defaultRoute = '',
    request = require('request'),
    restify = require('restify'),
    testServer, serverURL;

function serverSetup(server) {
    testServer.on('close', onClose);
    server.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS, PROPFIND, REPORT');
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Depth, Content-Type");
        res.header("Access-Control-Expose-Headers", "Date, Etag");
        next();
    });
}

function onClose() {
    debug && console.log('test server closed');
}

function startTestServer(options, thenDo) {
    options = options || {};
    testServer = restify.createServer({name: options.name})
    serverSetup(testServer);
    testServer.listen(options.port || defaultPort, function() {
        serverURL = testServer.url;
        if (options.subservers) {
            options.subservers.forEach(function(subserverRegistrationFunc) {
                subserverRegistrationFunc(options.route || defaultRoute, testServer);
            });
        }
        debug && console.log('%s listening at %s', testServer.name, testServer.url);
        thenDo && thenDo(null, testServer);
    });
}

function stopTestServer(thenDo) {
    testServer.close(thenDo);
}

function doRequest(method, path, options, callback) {
    request[method.toLowerCase()](serverURL + path, options, callback);
}

module.exports = {
    start: startTestServer,
    stop: stopTestServer,
    request: doRequest,
    post: doRequest.bind(null, 'post')
};
