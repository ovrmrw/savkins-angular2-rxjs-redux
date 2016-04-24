import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/subject/BehaviorSubject';

import {Action, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';

import {todosStateObserver, filterStateObserver} from './flux-state.helper';


// -- statefn
/*
  状態(State)管理をするクラス。オリジナルのstateFnがfunctionだったので全面的にclassに書き直した。ついでに名前をStateKeeperとした。
  classにすることで見通しが良くなり、扱いも簡単になる。特にViewでDIするときに@Inject()が不要になる。
  インスタンス化されるとObservableイベントがactionsの変化(push)を監視するようになる。これが理解できないとSavkin's Fluxは理解できない。
*/

// @Injectable() // Injectableはインスタンス生成をInjectorに任せる場合に必須。このサンプルではtoFactoryで生成するので不要。(@laco0416 さんありがとう！)
export class StateKeeper {
  private stateSubject: BehaviorSubject<AppState>; // "rxjs behaviorsubject"でググる。初期値を持てるのがポイント。

  constructor(initState: AppState, actions: Observable<Action>) { // actionsの型はDispatcher<Action>でも良いが敢えてそうする必要もない。
    this.stateSubject = new BehaviorSubject(initState); // BehaviorSubjectに初期値をセットする。

    // イベント発生毎にsubjectの内容を更新するイベントリスナー。そう、これはある意味イベントリスナーだ。
    // Observableで始まりsubscribeで終わるイベントリスナー(僕はSubscriptionと呼ぶ)はRxJSの基本なので覚えよう。
    // このSubscriptionはViewでActionをemitしたとき(dispatcher.next()がコールされたとき)に、内包されているactionsの変更を検知して発火する。これ重要。
    Observable
      .zip<AppState>( // "rxjs zip"でググる。
        todosStateObserver(this.stateSubject.value.todos, actions), // dispatcher.next()によりActionがemitされるとactionsの変更を検知してここが発火する。
        filterStateObserver(this.stateSubject.value.visibilityFilter, actions), //  〃
        (todos, visibilityFilter) => { // zipが返す値を整形できる。
          return { todos, visibilityFilter } as AppState; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
        }
      )
      // .do(s => console.log(s)) // 別にこれは要らない。ストリームの中間で値がどうなっているか確認したいときに使う。
      .subscribe(appState => { // "rxjs subscribe"でググる。
        this.stateSubject.next(appState); // "rxjs subject next"でググる。subject.next()により状態が更新される。Viewは更新された状態をstateプロパティを通してリードオンリーで受け取る。
      });
  }

  get state() { // Viewで状態を取得するときはこれを通じて取得する。stateSubjectはprivateなのでリードオンリーとなる。
    return this.stateSubject as Observable<AppState>; // View側で参照したときに見慣れたObservableになっているという親切設計。
  }
}