# lerna-semver-sync [![Build Status](https://travis-ci.org/snyamathi/lerna-semver-sync.svg?branch=master)](https://travis-ci.org/snyamathi/lerna-semver-sync) [![npm](https://img.shields.io/npm/v/lerna-semver-sync.svg)](https://www.npmjs.com/package/lerna-semver-sync)

[![Greenkeeper badge](https://badges.greenkeeper.io/snyamathi/lerna-semver-sync.svg)](https://greenkeeper.io/)
Keep the dependency versions in sync for each package in a monorepo

## Problem
Lerna seems to have some trouble with different dependency versions, even if they both "resolve" to the same version.  For example, both `^4.1.0` and `^4.2.0` may end up installing `4.5.6`, but Lerna doesn't de-duplicate the dependencies because the semver declaration is not identical.  This leads to slower install times, particularly in a CI/CD environment where this is done many times per day.

## Solution
For each package, collect the different dependency version declarations.  Then find the intersection of those declared ranges for each dependency.  Modify the `package.json` for each package in your monorepo to be that common semver declaration.

## Notes
- `^4.1.0` and `^4.2.0` would be modified to all be `^4.2.0`
- `^3.1.0`, `~3.7.0`, and `^3.6.0` would be modified to all be `~3.7.0`
- `~3.6.0` and `~3.8.0` are incompatible and an error is thrown `Range >=3.8.0 is not compatible with <3.7.0`
- Exact ranges are kept unaltered.  `4.0.0` and `^4.0.0` will not de-duplicate to `4.0.0`
- Each component of a compound ranges separated by `||` are de-duplicated separately and **must have a unique major version number**.  For example, `~0.14.0 || ^15.0.0 || ^16.0.0` is fine, `~15.0.0 || ~15.5.0` will throw an error.

Note that you'll want to verify the changes (`git diff`, etc.).  You may want to relax some changes manually rather than modify all your dependency versions.  In the above example, maybe `~3.7.0` is better off as `^3.7.0`.

## Before
```
// packages/foo/package.json         // packages/bar/package.json                // packages/baz/package.json
{                                    {                                           {
  "dependencies": {                    "dependencies": {                           "dependencies": {
    "classnames": "^2.3.6",              "classnames": "^2.3.0",                     "classnames": "^2.0.0",
    "create-react-class": "^15.0.0",     "create-react-class": "^15.5.0",            "create-react-class": "^15.5.1",
    "debug": "^2.1.1",                   "debug": "^2.0.0",                          "debug": "^2.0.0",
    "immutable": "^3.6.4",               "immutable": "~3.6.0",                      "immutable": "^3.6.0",
    "prop-types": "^15.5.8",             "prop-types": "^15.5.0",                    "prop-types": "^15.5.0",
    "react-intl": "^2.0.0",              "react-intl": "^2.0.0 || 2.0.0-beta.1",     "react-intl": "^2.0.0",
    "sinon": "^1.17.7",                  "sinon": "^1.0.2"                           "sinon": "^1.0.0",
  }                                    }                                           }
}                                    }                                           }
```

## After
```
// packages/foo/package.json         // packages/bar/package.json                // packages/baz/package.json
{                                    {                                           {
  "dependencies": {                    "dependencies": {                           "dependencies": {
    "classnames": "^2.3.6",              "classnames": "^2.3.6",                     "classnames": "^2.3.6",
    "create-react-class": "^15.5.2",     "create-react-class": "^15.5.2",            "create-react-class": "^15.5.2",
    "debug": "^2.1.1",                   "debug": "^2.1.1",                          "debug": "^2.1.1",
    "immutable": "~3.6.4",               "immutable": "~3.6.4",                      "immutable": "~3.6.4",
    "prop-types": "^15.5.8",             "prop-types": "^15.5.8",                    "prop-types": "^15.5.8",
    "react-intl": "^2.0.0",              "react-intl": "^2.0.0 || 2.0.0-beta.1",     "react-intl": "^2.0.0",
    "sinon": "^1.17.7"                   "sinon": "^1.17.7"                          "sinon": "^1.17.7"
  }                                    }                                           }
}                                    }                                           }
```

## Use

A script, `lerna-semver-sync.js` should be available in your `node_modules/.bin` folder.  Running it will clean up all the duplicate versions it can, then output any that it couldn't de-duplicate.

```
$ ./node_modules/bin/lerna-semver-sync.js
The following packages have duplicate versions that I can't de-duplicate
classnames: ^2.2.5, ^1.0.0
react-intl: ^2.0.0 || 2.0.0-beta-1, ^2.0.0
react-addons-perf: ~0.14.0 || ^15.0.0, ^15.0.0
react-addons-pure-render-mixin: ~0.14.3 || ^15.0.0, ^15.0.0
react-addons-shallow-compare: ~0.14.0 || ^15.0.0, ^15.0.0
```


