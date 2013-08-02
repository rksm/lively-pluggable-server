var debug = false,
    defaultPort = 9003,
    defaultRoute = '/',
    async = require('async'),
    path = require('path'),
    async = require('async'),
    util = require('util'),
    fs = require('fs'),
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

function registerSubserver(server, subserverRegFunc) {
    var oldRoutes = util._extend({}, server.routes);
    if (!subserverRegFunc.routes) subserverRegFunc.routes = [];
    subserverRegFunc(subserverRegFunc.route || defaultRoute, server);
    Object.keys(server.routes).forEach(function(routeName) {
        if (!(routeName in oldRoutes)) subserverRegFunc.routes.push(routeName); });
}

function unregisterSubserver(server, subserver) {
    if (!subserver.routes) return;
    subserver.routes.forEach(server.rm.bind(server));   
    subserver.routes.length = 0;
}

function startServer(options, thenDo) {
    options = options || {};
    var server = restify.createServer({name: options.name});
    servers.push({server: server});
    server.on('close', onClose.bind(null, server));
    server.use(cors);
    server.listen(options.port || defaultPort, function() {
        options.subservers && options.subservers.forEach(registerSubserver.bind(null, server));
        debug && console.log('%s listening at %s', server.name, server.url);
        thenDo && thenDo(null, server);
    });
}

function stopServer(server, thenDo) {
    server.close(thenDo);
}

function loadFromConfig(server, configFileName, thenDo) {
    var fullFilename;
    async.waterfall([
        function(next) {
            fs.realpath(configFileName, function(err, resolvedPath) {
                fullFilename = resolvedPath;
                next(err, fullFilename); });
        },
        fs.readFile,
        function(data, next) {
            var config;
            try { config = JSON.parse(data); } catch(e) { next(e); }
            config.location = path.dirname(fullFilename);
            next(null, config);
        },
        setupSubserversFromConfig.bind(null, server)
    ], function(err) { err && console.error(err); thenDo(err); });
}

function setupSubserversFromConfig(server, config, thenDo) {
    try {
        if (!config.subservers) thenDo(null);
        for (var subserverFn in config.subservers) {
            var settings = config.subservers[subserverFn];
            var subserver = require(path.join(config.location, subserverFn));
            subserver.route = settings.route;
            registerSubserver(server, subserver);
        }
    } catch(e) { e && console.error(e); thenDo(e); return; }
    thenDo(null);
}

function doRequest(method, server, path, options, callback) {
    request[method.toLowerCase()](server.url + path, options, callback);
}

module.exports = {
    start: startServer,
    stop: stopServer,
    load: registerSubserver,
    unload: unregisterSubserver,
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    loadFromConfig: loadFromConfig,
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    request: doRequest,
    post: doRequest.bind(null, 'post'),
    get: doRequest.bind(null, 'get'),
    // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    servers: servers
};
