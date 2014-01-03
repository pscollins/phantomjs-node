// Generated by CoffeeScript 1.3.3
(function() {
  var child, dnode, http, onSignal, phanta, shoe, startPhantomProcess, wrap,
    __slice = [].slice;

  dnode = require('dnode');

  http = require('http');

  shoe = require('shoe');

  child = require('child_process');

  phanta = [];

  startPhantomProcess = function(binary, port, args) {
    var ps;
    ps = child.spawn(binary, args.concat([__dirname + '/shim.js', port]));
    ps.stdout.on('data', function(data) {
      return console.log("phantom stdout: " + data);
    });
    ps.stderr.on('data', function(data) {
      if (data.toString('utf8').match(/(No such method.*socketSentData)|(CoreText performance note)/)) {
        return;
      }
      return console.warn("phantom stderr: " + data);
    });
    ps.on('error', function(err) {
      if ((err != null ? err.code : void 0) === 'ENOENT') {
        return console.error("phantomjs-node: You don't have 'phantomjs' installed");
      } else {
        throw err;
      }
    });
    return ps;
  };

  onSignal = function() {
    var phantom, _i, _len;
    for (_i = 0, _len = phanta.length; _i < _len; _i++) {
      phantom = phanta[_i];
      phantom.exit();
    }
    return process.exit();
  };

  process.on('exit', function() {
    var phantom, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = phanta.length; _i < _len; _i++) {
      phantom = phanta[_i];
      _results.push(phantom.exit());
    }
    return _results;
  });

  process.on('SIGINT', onSignal);

  process.on('SIGTERM', onSignal);

  wrap = function(ph) {
    ph._createPage = ph.createPage;
    return ph.createPage = function(cb) {
      return ph._createPage(function(page) {
        page._evaluate = page.evaluate;
        page.evaluate = function() {
          var args, cb, fn;
          fn = arguments[0], cb = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
          return page._evaluate.apply(page, [fn.toString(), cb].concat(args));
        };
        return cb(page);
      });
    };
  };

  module.exports = {
    create: function() {
      var arg, args, cb, httpServer, options, phantom, sock, _i, _len, _ref, _ref1;
      args = [];
      options = {};
      for (_i = 0, _len = arguments.length; _i < _len; _i++) {
        arg = arguments[_i];
        switch (typeof arg) {
          case 'function':
            cb = arg;
            break;
          case 'string':
            args.push(arg);
            break;
          case 'object':
            options = arg;
        }
      }
      if ((_ref = options.binary) == null) {
        options.binary = 'phantomjs';
      }
      if ((_ref1 = options.port) == null) {
        options.port = 12300;
      }
      phantom = null;
      httpServer = http.createServer();
      httpServer.listen(options.port);
      httpServer.on('listening', function() {
        var ps;
        ps = startPhantomProcess(options.binary, options.port, args);
        return ps.on('exit', function(code, signal) {
          var p;
          httpServer.close();
          if (phantom) {
            phantom && phantom.onExit && phantom.onExit();
            phanta = (function() {
              var _j, _len1, _results;
              _results = [];
              for (_j = 0, _len1 = phanta.length; _j < _len1; _j++) {
                p = phanta[_j];
                if (p !== phantom) {
                  _results.push(p);
                }
              }
              return _results;
            })();
          }
          if (options.onExit) {
            return options.onExit(code, signal);
          } else {
            console.assert(!(signal != null), "signal killed phantomjs: " + signal);
            return console.assert(code === 0, "abnormal phantomjs exit code: " + code);
          }
        });
      });
      sock = shoe(function(stream) {
        var d;
        d = dnode();
        d.on('remote', function(phantom) {
          wrap(phantom);
          phanta.push(phantom);
          return typeof cb === "function" ? cb(phantom) : void 0;
        });
        d.pipe(stream);
        return stream.pipe(d);
      });
      return sock.install(httpServer, '/dnode');
    }
  };

}).call(this);
