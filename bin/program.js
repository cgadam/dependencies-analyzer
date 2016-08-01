#!/usr/bin/env node

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
  @overview   This is a sample program that can be used out-of-the-box using:
              - Path Resolver
              - Node Resolver
  
  @author Christian Adam
*/

/* jshint node:true */

var program = require('commander'),
  fs = require('fs'),
  path = require('path');

program.allowUnknownOption();

var DependencyAnalyzer = require('..').DependencyAnalyzer,
  BaseResolver = require('..').Resolvers.BaseResolver;

var version = '0.0.1';

program.version(version)
  .option('-p, --package <package>', 'The package.json used for the analysis')
  .option('-d, --dev-dependencies', 'Consider also dev dependencies for the analysis', false)
  .option('-f, --files <file>', 'A comma-separated list of existing paths to ' +
    'the entry files from where the analysis will start.')
  .option('-s, --resolvers <list>', 'A comma-separated list of existing paths to the ' +
    'resolvers files that will be used during the analysis')
  .option('-r, --require-regexp <regexp>', 'Require regexp')
  .parse(process.argv);

/**
 * Checks whether path exists
 * @param   {string}  filePath The path
 * @returns {boolean} True if it exists, false otherwise
 */
function isExistingFile(filePath) {
  var exists = false;
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    return exists;
  }
  try {
    exists = fs.statSync(path.resolve(filePath)).isFile();
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return exists;
}

/**
 * Returns an array of paths that do exist.
 * @throws {Error} If the list is not well-formed or the files do not exist.
 * @param   {object} programOption The program option that should be a list of existing files
 * @param   {object} opts          Extra options
 * @returns {Array}  An array of string representing paths to files that do exist
 */
function getFilesList(programOption, opts) {
  var filesList,
    errorMsg = (opts && opts.errorMsg) ? opts.errorMsg : 'Invalid list of files detected.';

  function getFilesArr(filesStr) {
    return filesStr.split(',').map(function (el) {
      return el.trim();
    });
  }
  if (!programOption || getFilesArr(programOption).length === 0) {
    throw new Error(errorMsg);
  }
  filesList = getFilesArr(programOption);
  for (var i = 0, len = filesList.length; i < len; i++) {
    var file = filesList[i];
    if (!isExistingFile(file)) {
      throw new Error('File:  ' + file + ' does not exist.');
    }
    filesList[i] = path.resolve(file);
  }
  return filesList;
}

var requireRegExp,
  primaryFiles,
  resolvers;

try {
  requireRegExp = program.requireRegexp || '[^.]require\\(["\']([^\\)]+)["\']\\)';
  primaryFiles = getFilesList(program.files, {
    errorMsg: 'Entry files need to be provided for the analysis ' +
      'with a comma-separated list of paths: ' +
      './file1.js,../folder/file2.js'
  });

  if (!program.resolvers) {
    resolvers = [
      new (require('..').Resolvers.PathResolver)(program),
      new (require('..').Resolvers.NodeResolver)(program),
    ];
  } else {
    resolvers = getFilesList(program.resolvers, {
      errorMsg: 'Resolvers list should be a list of paths to the resolver files: ' +
        './resolverA.js,../folder/resolverB.js'
    }).map(function (resolverPath) {
      var loadPath = path.resolve(path.join(path.dirname(resolverPath), path.basename(resolverPath, path.extname(resolverPath)))),
        ResolverModule = require(loadPath);
      /* 
         THE PROGRAM ITSELF IS PASSED TO THE RESOLVER SO THAT EACH RESOLVER
         CAN READ CUSTOM OPTIONS 
      */
      return new ResolverModule(program);
    });
  }
} catch (err) {
  console.log('\nDependencies Analyzer v' + version);
  console.log('****************************');
  console.log('Run with --help for more info on how to use dep-analyzer.\n');
  console.log('ERROR: \n\n' + err.message);
  console.log('\n');
  process.exit(1);
}

var analyzer = new DependencyAnalyzer(primaryFiles, requireRegExp, resolvers);
analyzer.analyze();

console.log(JSON.stringify(analyzer.getDependenciesResult(), null, 2));