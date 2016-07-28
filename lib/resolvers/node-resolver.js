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

//Node dependencies
var path = require('path'),
  fs = require('fs'),
  util = require('util');

//Internal dependencies
var BaseResolver = require('./base/base-resolver'),
  Dependency = require('../dependencies/dependency');

/**
 * Knows how to resolve strings that match to node modules.
 * @param {object} opts Options for initialization
 */
function NodeResolver(opts) {
  BaseResolver.call(this, opts);
  if (opts && opts.package) {
    this.packageJson_ = JSON.parse(fs.readFileSync(path.resolve(opts.package)));
    this.dependencies_ = [];
    var addDependencies = function(packageJsonSection) {
      for (var dep in packageJsonSection) {
        if (this.dependencies_.indexOf(dep) === -1) {
          this.dependencies_.push(dep);
        }
      }
    };
    this.coreNodeModules_ = require('node-core-module-names');
    addDependencies = addDependencies.bind(this);
    addDependencies(this.packageJson_.dependencies);
    if(opts.devDependencies){
      addDependencies(this.packageJson_.devDependencies); 
    }
  }else{
    throw new Error('Node Resolver requires a package.json for the analysis.');
  }
}

util.inherits(NodeResolver, BaseResolver);

NodeResolver.prototype.init = function (analyzer) {
  var self = this;
  this.dependencies_.forEach(function(dep){
    analyzer.addDependency(self.resolve(dep));
  });
};

NodeResolver.prototype.isDep = function (componentName) {
  /*
    Any string is suceptible to be a node dependency, so
    this resolver should be the last resolver to be called
    in an array of possible resolvers.
  */
  return true;
};

NodeResolver.prototype.resolve = function (nodeComponentName, callee) {
  var resolvedValue = null,
    componentName = nodeComponentName.split('/')[0],
    isCoreNodeDep = this.coreNodeModules_.indexOf(componentName) !== -1,
    isExistingDep = this.dependencies_.indexOf(componentName) !== -1;
  if(isExistingDep || isCoreNodeDep){
    resolvedValue = componentName;
  }
  var dep = new Dependency(componentName, resolvedValue, false);
  if(isCoreNodeDep){
    dep.setCore(true);
  }
  return dep;
};

module.exports = NodeResolver;