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
  path = require('path'),
  strip = require('strip-comments'),
  BaseResolver = require('./resolvers/base/base-resolver');

function addIfNotPresent(arr, element) {
  if (arr.indexOf(element) === -1) {
    arr.push(element);
  }
}

function DependencyResult(resolvedValue, isCore) {
  this.names_ = [];
  this.requiredBy_ = [];
  this.resolvedValue_ = resolvedValue;
  this.requiredNumber_ = 0;
  this.isCore_ = isCore;
}

DependencyResult.prototype.getNames = function () {
  return this.names_;
};

DependencyResult.prototype.addRequiredBy = function (callee) {
  this.requiredNumber_++;
  addIfNotPresent(this.requiredBy_, callee);
};

DependencyResult.prototype.addName = function (name) {
  addIfNotPresent(this.names_, name);
};

DependencyResult.prototype.getResolvedValue = function () {
  return this.resolvedValue_;
};

/**
 * Given a require regexp, the analyzer knows how to start browsing the
 * entry files looking for require expressions. It then lets the "resolver"
 * to figure out how to resolve the string being passed to require. 
 * @throws {Error} If the initial parameters are invalid
 * @param {Array}  entryFiles                                                  An array of files that will be considered as the
 *                                                                             entry files. (The code analysis will start from this
 *                                                                             files)
 * @param {Array}  resolvers                                                   An array of resolver objects that will be used to analyze
 *                                                                             the strings being passed to the require statement.
 * @param {object} opts                                                        Optional parameters
 * @param {string} [opts.requireRegexp='[^.]require\\(["\']([^\\)]+)["\']\\)'] A regular expression for extracting the content of a 
 *                                                                             require statement.
 */
function DependencyAnalyzer(entryFiles, resolvers, opts) {
  this.requireRegexp_ = (opts && opts.requireRegexp) ? opts.requireRegexp : '[^.]require\\(["\']([^\\)]+)["\']\\)';
  if (!Array.isArray(resolvers) || resolvers.length === 0) {
    throw new Error('No resolvers specified.');
  }
  resolvers.forEach(function (resolver) {
    if (!(resolver.constructor.super_ && resolver.constructor.super_.name === BaseResolver.name)) {
      throw new Error(resolver + ' is not a valid resolver.');
    }
  });
  var entryFiles_ = [];
  if (!Array.isArray(entryFiles) || entryFiles.length === 0) {
    throw new Error('The entry files needs to be a valid non-empty array of paths');
  } else {
    entryFiles.forEach(function (entryFile) {
      entryFile = path.resolve(entryFile);
      if (!fs.existsSync(entryFile)) {
        throw new Error('Entry file does not exist: ' + entryFile);
      }
      entryFiles_.push(entryFile);
    });
  }
  this.entryFiles_ = entryFiles_; //The initial for doing the dependency analysis
  this.filesToAnalyze_ = [].concat(this.entryFiles_); //The files to analyze
  this.filesAnalyzed_ = []; //The files that have already been analyzed
  this.resolvers_ = resolvers; //The resolvers to be used
  this.depsResult_ = [];
  var self = this;
  /*
    Initialize resolvers
  */
  this.resolvers_.forEach(function (resolver) {
    if (resolver && resolver.init && typeof resolver.init === 'function') {
      resolver.init(self);
    }
  });
}

DependencyAnalyzer.prototype.analyze = function () {

  if (this.filesToAnalyze_.length === 0) {
    return;
  }

  var fileToAnalyze = this.filesToAnalyze_.pop(),
    requireStrings = this.getRequireStrings_(fs.readFileSync(fileToAnalyze).toString());
  for (var i = 0, len = requireStrings.length; i < len; i++) {
    var requireString = requireStrings[i];
    var dep = this.resolve_(requireString, fileToAnalyze);
    if (dep) {
      this.addDependency(dep, fileToAnalyze);
      if (dep.shouldBeAnalyzed()) {
        this.addFileToAnalyze(dep.getResolvedValue());
      }
    }
  }
  this.filesAnalyzed_.push(fileToAnalyze);
  this.analyze();
};

DependencyAnalyzer.prototype.getDependencyResult_ = function (dependency) {
  var depResultFound;
  for (var i = 0, len = this.depsResult_.length; i < len; i++) {
    var depResult = this.depsResult_[i];
    if ((depResult.getResolvedValue() && depResult.getResolvedValue() === dependency.getResolvedValue()) ||
      (depResult.getNames().indexOf(dependency.getName()) !== -1)) {
      depResultFound = depResult;
      break;
    }
  }
  return depResultFound;
};

DependencyAnalyzer.prototype.getRequireStrings_ = function (fileContent) {
  var regExp = new RegExp(this.requireRegexp_, 'g'),
    textToAnalyze = strip(fileContent);
  var matchResult = regExp.exec(textToAnalyze);
  var requireStrings = [];
  while (matchResult) {
    for(var i=1, len = matchResult.length; i < len; i++){
      if(matchResult[i]){
        requireStrings.push(matchResult[i]);
        break;
      }
    }
    matchResult = regExp.exec(textToAnalyze);
  }
  return requireStrings;
};

DependencyAnalyzer.prototype.resolve_ = function (depString, fileToAnalyze) {
  var resolverToUse;
  for (var i = 0, len = this.resolvers_.length; i < len; i++) {
    var resolver = this.resolvers_[i];
    if (resolver.isDep(depString)) {
      resolverToUse = resolver;
      break;
    }
  }
  var ret;
  if (resolverToUse) {
    ret = resolverToUse.resolve(depString, fileToAnalyze);
  }
  return ret;
};

DependencyAnalyzer.prototype.getDependenciesResult = function () {
  return this.depsResult_;
};

DependencyAnalyzer.prototype.addDependency = function (dep, calleeFile) {
  var depResult = this.getDependencyResult_(dep);
  if (!depResult) {
    depResult = new DependencyResult(dep.getResolvedValue(), dep.isCore());
    this.depsResult_.push(depResult);
  }
  if (depResult.getNames().indexOf(dep.getName()) === -1) {
    depResult.addName(dep.getName());
  }
  if (calleeFile) {
    depResult.addRequiredBy(calleeFile);
  }
};

DependencyAnalyzer.prototype.addFileToAnalyze = function (pathToFile) {
  if (pathToFile &&
    this.filesAnalyzed_.indexOf(pathToFile) === -1 &&
    this.filesToAnalyze_.indexOf(pathToFile) === -1) {
    this.filesToAnalyze_.push(pathToFile);
  }
};

DependencyAnalyzer.prototype.getEntryFiles = function () {
  return this.entryFiles_;
};

module.exports = DependencyAnalyzer;