# Dependency Analyzer
After coding enough in a node.js project you might end up asking yourself: *are all the **dependencies** defined in my **package.json** actually being **used in my project***? 

The truth is that *we always add dependencies* (otherwise the code would not work), but, *do we always **remove** them when they're not needed anymore?* If you're 
disciplined enough you might do it but you can't be accountable for the other *N developers* working in your same project!. The thing is that there's nothing preventing us 
from having a dependency defined and not being used: meaning, **the code will still work**.

The other way around, although it's less likely to happen, is also valid. *Do you have all the **npm dependencies** you need to have declared in your **package.json**?*
The answer will come to light during the execution of your program. Well, **as long as the code is executed**, right?

This dependency analyzer *is aimed to check consistency between the **"definition of dependencies"** vs **"their real usage in the source code"** and provide useful 
information for you to take further actions*. It's basically a static analysis.

## How it works
There are 3 essential things to consider for the analysis:
- The "require call"
- The "resolvers"
- The "entry files"

The analyzer is constructed with the 3 items mentioned above. After being created it "initializes" each "resolver" (this is the one-chance each resolver has
to actually modify the analyzer instance). Node resolver, for example, register all the dependencies in the package.json during this initialization in the dependencies
list that the analyzer has.

The analyzer then starts its analysis from the "entry files". One by one it looks in the code (eliminating any comments) for the "require calls" (which is
a customizable regexp) and for each "string" being passed to the require call it asks every "resolver" whether this is a string the resolver knows 
how to solve. If the resolver knows how to solve it, it then passes this string to the resolver asking for a resolution.

The resolution is specific to each resolver but in the end the resolver returns a "Dependency" object telling:

- The name of the dependency
- The resolved value (which can be the path of the file)
- Whether this dependency should be analyzed too or not.
- A flag indicating if this is a core dependency or not.

The "name" of the dependency is typically the string used in the "require" expression to reference this dependency (this, however, can be modified by each resolver). 

The resolved value depends on the type of the dependency:
- For regular files (dependencies called with './' or '../') the resolved value is the path to the file.
- For regular node dependencies: like "fs", etc. The resolved value is the same as its name as long as the dependency is present in the package.json file.

Dependencies also contain a flag telling whether they should be analyzed or not. If set to true, the resolved value will be used for continuing the analysis (resolved value must be an existing path), if false it won't analyze the dependency, meaning there's no file to scan.

Finally, each resolver knows whether a dependency is a core dependency or not. 
(Core dependencies are never analyzed as they are supposed to be in runtime always).

The process looks like this:

```
                               +-----------------+
                               |                 |
                               |  +----+         |
                               |  |    +------------> A require(XXXX) expression
             Analyzer +-------->  +----+         |               +
                               |                 |               |
     (Walks thru the document  |         +----+  |               v
     looking for "require"     |         |    |  |   XXXX is passed to each resolver to see
     calls. If one is found,   |         +----+  |   if the resolver knows how to solve it
     it resolves the string    |                 |      |
     using the registered      |                 |      |
     resolvers)                |      +----+     |      v
                               |      |    |     |   Resolver + isDep()
                               |      +----+     |      +     + resolve()
                               |                 |      |
                               |                 |      +--> it resolves the "string"
                               +-----------------+           returning back a "dependency object"
                                    Document

```

## Resolvers
As we stated before, "resolvers" are special modules that know, given a certain string, how to solve the associated dependency. 
They are supposed to know if the string being passed to a require() call corresponds to a relative path or to a dependency defined
in the package json.

There are two by-default "resolvers" provided in this module but the good thing is that you can add your own resolver as long as you inherits your resolver
from the BaseResolver module.

### The algorithm
It all starts in the analyzer. The analyzer takes the "entry files" and one by one opens them. The content of the file is then passed thru "strip-comments"
which is a module that helps remove the "comments" in the JavaScript code. 

After the comments are removed, the analyzer executes the "require call regexp" on that text to find all the ocurrences of the require call. 
The analyzer always takes the first capturing group of the match for doing the analysis. It then passes that string to the resolvers 
for asking them whether this is a string they know how to solve 

*Important here: the ORDER of the resolvers in the array of resolvers
passed to the analyzer during construction matters as this is the order that will be used for asking whether a dependency applies to one resolver and not other.*

Once the resolver that knows how to resolve the string is found, the "resolve" method of that resolver is called. The resolver then returns always a "Dependency"
indicating: the name of the dependency, the resolved value, a flag indicating if the dependency itself should also be analyzed and a flag telling if this is 
considered a core dependency or not.

With that returned dependency, the analyzer then constructs a "Dependency Result" which is nothing but an entity where the analyzer accumulates results associated 
to the dependencies. Here is where the list of callees is kept, and also the number of times a dependency was required. If the dependency is already part of a 
"Dependency Result" then it continues accumulating results there, if not, then a new Dependency Result is constructed.

On the other hand, the analyzer keeps a list of all the files "analyzed" and "to analyze". If the dependency shouldBeAnalyzed the path to the dependency is added
to the "to analyze" list (unless, of course, that file was already analyzed). This is how the analyzer proceeds with the analysis. The process continues until 
there's no more files to analyze.

This all happens in a synchronous way. As a result, after calling **"analyze()"** method of the analyzer you can call **"getDependenciesResult"** and obtain 
the consolidated list of results.

# The Sample

A sample of how this works can be found in:

    ./sample

folder.

If you run this:

    dep-analysis -p ./sample/package.json -f ./sample/index.js
    
You'll get this result:    

    [
      {
        "names_": [
          "pokemon-cli"
        ],
        "requiredBy_": [],
        "resolvedValue_": "pokemon-cli",
        "requiredNumber_": 0,
        "isCore_": false
      },
      {
        "names_": [
          "node-core-module-names"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/a-inner-module.js"
        ],
        "resolvedValue_": "node-core-module-names",
        "requiredNumber_": 1,
        "isCore_": false
      },
      {
        "names_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/a-module.js"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/index.js"
        ],
        "resolvedValue_": "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/a-module.js",
        "requiredNumber_": 1,
        "isCore_": false
      },
      {
        "names_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/a-inner-module.js"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/a-module.js"
        ],
        "resolvedValue_": "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/a-inner-module.js",
        "requiredNumber_": 1,
        "isCore_": false
      },
      {
        "names_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/file-does-not-exists.js"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/a-module.js"
        ],
        "resolvedValue_": null,
        "requiredNumber_": 1,
        "isCore_": false
      },
      {
        "names_": [
          "request"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/a-module.js"
        ],
        "resolvedValue_": null,
        "requiredNumber_": 1,
        "isCore_": false
      },
      {
        "names_": [
          "path"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/a-inner-module.js"
        ],
        "resolvedValue_": "path",
        "requiredNumber_": 1,
        "isCore_": true
      }
    ]

  Let's analyze each field one by one:
  (Let's take this one as an example)
  
      {
        "names_": [
          "node-core-module-names"
        ],
        "requiredBy_": [
          "/Users/cgadam/GitHub/dependencies-analyzer/sample/modules/inner/a-inner-module.js"
        ],
        "resolvedValue_": "node-core-module-names",
        "requiredNumber_": 1,
        "isCore_": false
      }
  
  * __Names__: you might find the same dependency being called in different ways in the code (each way is probably understood by different resolvers) . As long as the dependency is solved (no matter which resolver solved it) to the same resolved value then we're always talking about the same dependency. The different "names" used to reference this dependency are added to this array.
  
  * __Required By__: the list of all the files calling this dependency. If the array is empty it means this dependency is being loaded/defined but the visited code is not using it.
  
  * __Resolved value__: the resolved value calculated by the resolvers. If the value is NULL it indicates a dependency that is being used in the code but it's not loaded/defined/does not exists.
  
  * __Required number__: the # of times this dependency was required. 0 means the same as empty array in requiredBy = not being used.
  
  * __isCore__: indicates whether this is a core module. A "core" module is a module you can assume will always be loaded in runtime. There's no need to analyze this kind of modules and its related dependencies. (Like "fs" and "path" that are core node.js modules).