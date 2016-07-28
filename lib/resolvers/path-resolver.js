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
 * Knows how to solve paths when calling require
 * @param {object} opts Options for initialization
 */
function PathResolver(opts) {
  BaseResolver.call(this, opts);
}

util.inherits(PathResolver, BaseResolver);

PathResolver.prototype.isDep = function (componentName) {
  return componentName.search('./') === 0 ||
    componentName.search('../') === 0 ||
    componentName.search('/') === 0;
};

PathResolver.prototype.resolve = function (componentName, callee) {
  var fullPath = path.resolve(path.dirname(callee), componentName),
    dependency;
  try {
    var resolvedPath = this.loadAsFile_(fullPath);
    if (!resolvedPath) {
      resolvedPath = this.loadAsDir_(fullPath);
    }
    var depName = fullPath;
    if(resolvedPath){
      depName = resolvedPath;
    }
    dependency = new Dependency(depName, resolvedPath, true);
  }
  catch(err){
    //It's a valid require expression we don't care about it.
  }
  return dependency;
};

PathResolver.prototype.getFilePathWithExtension_ = function(file, ext){
  var addExtension = true,
    extIndex = file.length - ext.length;
  if (extIndex > 0 && file.slice(extIndex, file.length) === ext) {
    addExtension = false;
  }
  return file + (addExtension ? ext : '');
};

PathResolver.prototype.loadAsFile_ = function (file) {
  var resolvedPath = null,
    jsFile = this.getFilePathWithExtension_(file, '.js'),
    jsonFile = this.getFilePathWithExtension_(file, '.json');
  if(fs.existsSync(jsFile)){
    resolvedPath = jsFile;
  }else{
    if(fs.existsSync(jsonFile)){
      throw new Error('A valid require expression we don\'t care about detected.');
    }
  }
  return resolvedPath;
};

PathResolver.prototype.loadAsDir_ = function (folder) {
  var resolvedPath = null;

  function loadPackageJson(folder) {
    var resolvedPath = null,
      packageJson = path.join(folder, 'package.json');
    if (fs.existsSync(packageJson)) {
      resolvedPath = JSON.parse(fs.readFileSync(packageJson)).main;
    }
    return resolvedPath;
  }
  
  function loadAsIndex(folder){
    var resolvedPath = null,
      index = path.join(folder, 'index.js');
    if (fs.existsSync(index)) {
      resolvedPath = index;
    }
    return resolvedPath;
  }
  
  resolvedPath = loadPackageJson(folder);
  if(!resolvedPath){
     resolvedPath = loadAsIndex(folder);
  }
  
  return resolvedPath;
  
};

module.exports = PathResolver;