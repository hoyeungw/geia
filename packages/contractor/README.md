# @geia/contractor

[![npm version][badge-npm-version]][url-npm]
[![npm download monthly][badge-npm-download-monthly]][url-npm]
[![npm download total][badge-npm-download-total]][url-npm]
[![npm dependents][badge-npm-dependents]][url-github]
[![npm license][badge-npm-license]][url-npm]
[![pp install size][badge-pp-install-size]][url-pp]
[![github commit last][badge-github-last-commit]][url-github]
[![github commit total][badge-github-commit-count]][url-github]

[//]: <> (Shields)
[badge-npm-version]: https://flat.badgen.net/npm/v/@geia/contractor
[badge-npm-download-monthly]: https://flat.badgen.net/npm/dm/@geia/contractor
[badge-npm-download-total]:https://flat.badgen.net/npm/dt/@geia/contractor
[badge-npm-dependents]: https://flat.badgen.net/npm/dependents/@geia/contractor
[badge-npm-license]: https://flat.badgen.net/npm/license/@geia/contractor
[badge-pp-install-size]: https://flat.badgen.net/packagephobia/install/@geia/contractor
[badge-github-last-commit]: https://flat.badgen.net/github/last-commit/hoyeungw/geia
[badge-github-commit-count]: https://flat.badgen.net/github/commits/hoyeungw/geia

[//]: <> (Link)
[url-npm]: https://npmjs.org/package/@geia/contractor
[url-pp]: https://packagephobia.now.sh/result?p=@geia/contractor
[url-github]: https://github.com/hoyeungw/geia

##### Fork cluster with configs

#### Install
```console
$ npm install @geia/contractor
```

#### Usage
```js
import { Institute } from '@geia/contractor'
Institute.build({ exec:'path-to-worker/worker.js', env:{} })
```

#### Meta
[LICENSE (MIT)](LICENSE)
