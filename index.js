/*
  
  @license
  The MIT License (MIT)

  Copyright (c) 2016 Christian Adam

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

/*
  @author Christian Adam
*/

/* jshint node:true */

var fs = require('fs'),
  path = require('path');

/**
 * Automatically loads all the .js files under ./lib/resolvers folder
 * as registered resolvers. They are exported in the exports object under
 * "Resolvers" attr.
 * @returns {object} The registered resolvers object.
 */
function loadResolvers() {
  var Resolvers = {};
  Resolvers.BaseResolver = require('./lib/resolvers/base/base-resolver');
  var files = fs.readdirSync(path.join(__dirname, 'lib', 'resolvers'));
  for (var i = 0, len = files.length; i < len; i++) {
    var file = files[i];
    if (path.extname(file) === '.js') {
      var resolver = require('./lib/resolvers/' + file);
      Resolvers[resolver.name] = resolver;
    }
  }
  return Resolvers;
}

module.exports = {
  DependencyAnalyzer: require('./lib/dependencies-analyzer.js'),
  Resolvers: loadResolvers(),
  Dependency: require('./lib/dependencies/dependency.js')
};