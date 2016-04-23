import {OpaqueToken, bind} from 'angular2/core';
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
  Providerはprovide()で書いても良いが、個人的にはbind()の方が書きやすくて好きだ。
*/
export class Dispatcher<T> extends Subject<T> { // RxJSのSubjectクラスを継承してDispatcherクラスを作る。このクラスはDIで使う。
  constructor(destination?: Observer<T>, source?: Observable<T>) {
    super(destination, source);
  }
}

// 最後の方に出てくるTodoAppコンポーネントのprovidersにセットしており、bootstrap()時にインスタンス化される。(@laco0416 さんありがとう！)
// StateKeeperのインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// 後述するdispatcher.next()がコールされたときにStateKeeper内部へ伝播してObservableイベント(Subscription)を強制発火させている。(という個人的な解釈)
export const stateAndDispatcher = [
  bind('initState').toValue({ todos: [], visibilityFilter: 'SHOW_ALL' } as AppState), // Viewから参照しないのでOpaqueTokenは使っていない。
  bind(Dispatcher).toValue(new Dispatcher<Action>(null)), // 超重要。Viewでnext()をコールすることでStateKeeperクラス内のイベントリスナーを発火させる。
  bind(StateKeeper).toFactory((state, dispatcher) => new StateKeeper(state, dispatcher), ['initState', Dispatcher]) // toFactoryの第二引数はTokenの配列であることに注意。bootstrap時にTokenを通じて値がStateKeeperの引数にあてられる。
];