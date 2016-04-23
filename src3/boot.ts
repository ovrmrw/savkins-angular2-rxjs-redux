import {enableProdMode} from 'angular2/core';
import {bootstrap} from 'angular2/platform/browser';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/do';
import 'rxjs/add/observable/zip';

import {TodoApp} from './components/todo.app.component';


enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。(@laco0416 さんありがとう！)
bootstrap(TodoApp) // TodoAppコンポーネントのprovidersにセットしたProvider達はこのときに一度だけインスタンス化される。
  .catch(err => console.error(err));