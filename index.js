var debug = false,
    defaultPort = 9003,
    defaultRoute = '/',
    request = require('request'),
    restify = require('restify'),
    servers = [];

function cors(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS, PROPFIND, REPORT');
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Depth, Content-Type");
    res.header("Access-Control-Expose-Headers", "Date, Etag");
    next();
}

function onClose(server) {
    debug && console.log('test server closed');
    for (var i = 0; i < servers.length; i++) {
        if (servers[i].server === server) {
            servers.splice(i, 1); return; }
    }
}

function startServer(options, thenDo) {
    options = options || {};
    var server = restify.createServer({name: options.name});
    servers.push({server: server});
    server.on('close', onClose.bind(null, server));
    server.use(cors);
    server.listen(options.port || defaultPort, function() {
        if (options.subservers) {
            options.subservers.forEach(function(subserverRegistrationFunc) {
                subserverRegistrationFunc(subserverRegistrationFunc.route || defaultRoute, server);
            });
        }
        debug && console.log('%s listening at %s', server.name, server.url);
        thenDo && thenDo(null, server);
    });
}

function stopServer(server, thenDo) {
    server.close(thenDo);
}

function doRequest(method, server, path, options, callback) {
    request[method.toLowerCase()](server.url + path, options, callback);
}

module.exports = {
    start: startServer,
    stop: stopServer,
    request: doRequest,
    post: doRequest.bind(null, 'post'),
    servers: servers
};
