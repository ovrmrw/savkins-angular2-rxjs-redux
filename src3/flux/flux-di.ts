import {bind} from 'angular2/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subject} from 'rxjs/Subject';

import {Action} from './flux-action';
import {StateKeeper} from './flux-state';


// -- DI config
/*
  DI設定。Fluxの要。ViewとLogicを巧妙に分離している。理解に至るまでの道のりは長い。ひたすら難しい。こんなことを考案したのは一体誰だ。
  それでもここが理解できないとSavkin's Redux with RxJS for Angular2は理解できない。調べるにあたっては英語力とググり能力が試される最大の難所と言っても良い。
  https://laco0416.github.io/post/platform-prividers-of-angular-2/ を参考にすると理解の助けになるかもしれない。
  Providerはprovide()で書いても良いが個人的にはbind()の方が書きやすくて好きだ。provideはGrunt、bindはGulpみたいな違い。
*/

// RxJSのSubjectクラスを継承してDispatcherクラスを作る。このクラスはDIで使う。
// Dispatcherをクラスとして用意しておくことでComponentのDIに関する記述がシンプルになる。シンプルさは正義である。
export class Dispatcher<T> extends Subject<T> { 
  constructor(destination?: Observer<T>, source?: Observable<T>) { // この記述はRxJSのソースからパクった。
    super(destination, source);
  }
}

// TodoAppコンポーネントのprovidersにセットしており、Angular2のbootstrap()時にインスタンス化されComponentに紐付けられる。(@laco0416 さんありがとう！)
// StateKeeperのインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// Componentでdispatcher.next()をコールしたときにStateKeeper内部のObservable(scan)のscanサイクルを回すことができる。
export const stateAndDispatcher = [
  bind('initState').toValue({ todos: [], visibilityFilter: 'SHOW_ALL' } as AppState), // Componentから参照しないのでOpaqueTokenは使っていない。
  bind(Dispatcher).toValue(new Dispatcher<Action>(null)), // 超重要。これが全てを一つの輪に紡ぎ上げる。Savkin's Fluxの循環サイクルを理解できたとき、人は悟りを知るだろう。
  bind(StateKeeper).toFactory((state, dispatcher) => new StateKeeper(state, dispatcher), ['initState', Dispatcher]) // toFactoryの第二引数はTokenの配列であることに注意。bootstrap時にTokenを通じて値がStateKeeperの引数にあてられる。
];