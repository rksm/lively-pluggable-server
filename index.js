var debug = false,
    defaultPort = 9003,
    defaultRoute = '/test',
    request = require('request'),
    restify = require('restify'),
    testServer, serverURL;

function startTestServer(options, thenDo) {
    options = options || {};
    testServer = restify.createServer({name: options.name});
    testServer.listen(options.port || defaultPort, function () {
        serverURL = testServer.url;
        if (options.subservers) {
            options.subservers.forEach(function(subserverRegistrationFunc) {
                subserverRegistrationFunc(options.route || defaultRoute);
            });
        }
        debug && console.log('%s listening at %s', testServer.name, testServer.url);
        thenDo && thenDo(null, testServer);
    });
    testServer.on('close', function() {
        debug && console.log('test server closed');
    });
}

function stopTestServer(thenDo) {
    testServer.close(thenDo);
}

module.exports = {
    start: startTestServer,
    stop: stopTestServer
};
