# lerna-semver-sync [![Build Status](https://travis-ci.org/snyamathi/lerna-semver-sync.svg?branch=master)](https://travis-ci.org/snyamathi/lerna-semver-sync) [![npm](https://img.shields.io/npm/v/lerna-semver-sync.svg)](https://www.npmjs.com/package/lerna-semver-sync)
Keep the dependency versions in sync for each package in a monorepo

## Problem
Lerna seems to have some trouble with different dependency versions, even if they both "resolve" to the same version.  For example, both `^4.1.0` and `^4.2.0` may end up installing `4.5.6`, but lerna doesn't de-duplicate the dependencies becuse the semver declaration is not identical.  This leads to slower install times, particularly in a CI/CD environment where this is done many times per day.

## Solution
By modifying the dependency versions in each `package.json` so that it is the interection of all other packages, we can get the minimum number of different versions floating around.

`^4.1.0` and `^4.2.0` would be modified to all be `^4.2.0`
`^3.1.0`, `~3.7.0`, and `^3.6.0` would be modified to all be `~3.7.0`

If there are any incompatible versions (eg `~3.6.0` and `~3.8.0`) an error is thrown `Range >=3.8.0 is not compatible with <3.7.0`

Note that you'll want to verify the changes (`git diff`, etc.).  You may want to relax some changes manually rather than modify all your dependency versions.  In the above example, maybe `~3.7.0` is better off as `^3.7.0`.

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
