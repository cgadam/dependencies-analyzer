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

/**
 * A base class for Resolvers.
 * A resolver is a class that knows how to resolve the strings
 * being passed to a require expression.
 * 
 * For example:
 * 
 * - require('./aFile'): the string being passed to this require 
 * is a path to a relative path. This is the kind of dependencies
 * the "path-resolver" knows how to solve.
 * 
 * A resolver knows what the name of a dependency resolved to.
 * 
 */
function BaseResolver(opts) {}

/**
 * The resolver will have a one-time chance to modify the analyzer 
 * (if neccessary) during the init() of the Resolver.
 * @param {object} analyzer An analyzer
 */
BaseResolver.prototype.init = function (analyzer) {};

/**
 * Indicates whether the string being passed is a dependency 
 * this resolver can handle.
 * @param   {string}  The component to check
 * @returns {boolean} True is this resolver can handle it, false otherwise
 */
BaseResolver.prototype.isDep = function (component) {
  throw new Error('Required method not implemented in base class');
};

/**
 * Resolves the string and returns the Dependency object associated to it
 * @returns {object} The actual dependency
 */
BaseResolver.prototype.resolve = function (component, callee) {
  throw new Error('Required method not implemented in base class');
};

module.exports = BaseResolver;