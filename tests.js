var serverManager = require('./index'),
    path = require("path"),
    async = require("async"),
    fsHelper = require("./fs-helper"),
    port = 9003, server;

var subserver;
function makeSubserver(route) {
    subserver = function(route, server) {
        server.get(route, function(req, res) { res.end('foo'); });
    }
    subserver.route = route;
    return subserver;
}

var tests = {
    setUp: function (callback) {
        serverManager.start({
            port: port,
            subservers: [makeSubserver('/test')]
        }, function(err, s) { server = s; callback(err); });
    },
    tearDown: function (callback) {
        async.series([
            serverManager.stop.bind(null, server),
            fsHelper.cleanupTempFiles
        ], callback);
    },
    testSubserverRequest: function (test) {
        test.deepEqual(subserver.routes, ['gettest'], 'routes');
        serverManager.get(server,'/test', function(err, res, body) {
            test.equal(body, 'foo', 'subserver get');
            test.done();
        });
    },
    testSubserverUnload: function (test) {
        serverManager.unload(server, subserver);
        test.deepEqual(subserver.routes, [], 'routes');
        test.done();
    },
    testSubserverFromFile: function (test) {
        var subserverSource = "module.exports = function(baseRoute, app) {\n"
                            + "    app.get(baseRoute, function(req, res) {\n"
                            + "        res.end('hello'); });\n"
                            + "}",
            configSource = '{"subservers":{"subserver.js":{"route":"/test2"}}}'
        fsHelper.createDirStructure('.', {
            testSubserverFromFile: {
                "subserver.js": subserverSource,
                "config.json": configSource
            }
        }, function() {
            serverManager.loadFromConfig(server, "testSubserverFromFile/config.json", function(err) {
                serverManager.get(server,'/test2', function(err, res, body) {
                    test.equal(body, 'hello', 'subserver get');
                    test.done();
                });            
            });
        });
    }
};

module.exports = tests;
