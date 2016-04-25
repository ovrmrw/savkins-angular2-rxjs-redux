import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/subject/BehaviorSubject';

import {Action, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';

import {todosStateObserver, filterStateObserver} from './flux-state.helper';


// -- statefn
/*
  状態(State)管理をするクラス。オリジナルのstateFnがfunctionだったので全面的にclassに書き直した。ついでに名前をStateKeeperとした。
  classにすることで見通しが良くなり、扱いも簡単になる。特にComponentでDIするときに@Inject()が不要になる。
  Angular2のbootstrap()時にインスタンス化されると、変数stateSubjectのnextがChangeDetection機構のOnPushをトリガーしてComponent側で更新が始まる。これが理解できないとSavkin's Fluxは理解できない。
*/

// @Injectable() // Injectableはインスタンス生成をInjectorに任せる場合に必須。このサンプルではtoFactoryで生成するので不要。(@laco0416 さんありがとう！)
export class StateKeeper {
  private stateSubject: BehaviorSubject<AppState>; // "rxjs behaviorsubject"でググる。初期値を持てるのがポイント。

  constructor(initState: AppState, dispatcher$: Observable<Action>) { // dispatcherの型はDispatcher<Action>でも良いが敢えてそうする必要もない。
    this.stateSubject = new BehaviorSubject(initState); // BehaviorSubjectに初期値をセットする。

    // イベント発生毎にsubjectの内容を更新するイベントリスナー。そう、これはある意味イベントリスナーだ。←否！僕は勘違いしていた。
    // この一節の理解はとても難しい。RxJSのObservableが一体どういうものなのか理解できるまでは腑に落ちないだろう。
    // これは"初回に一度だけ"実行され、その後はフワフワ漂うように存在し、必要に応じて"呼び出すのではなく呼び出される"のである。"反応する、呼応する"と言った方がいいかもしれない。(@bouzuya さんありがとう！)
    // 重要なのはObservable(zip)がObservable(scan)を内包しており、dispatcherのnextによる"内側から(?)"のデータの伝播が発生すること。(適当)    
    Observable
      .zip<AppState>( // "rxjs zip"でググる。
        // Componentでのdispatcher.next()により、Observable(zip)に内包されたObservable(scan)にクロージャされたdispathcerがscanサイクルを回し、その結果をzipで受けてsubscribeに流す。
        // todosStateObserverとfilterStateObserverの両方の結果を受けるまでzipはストリームを待機する。
        todosStateObserver(initState.todos, dispatcher$), // 勘違いしてはいけない。これは"初回に一度だけ"実行される関数である。
        filterStateObserver(initState.visibilityFilter, dispatcher$), //  〃
        (todos, visibilityFilter) => { // zipが返す値を整形できる。
          return { todos, visibilityFilter } as AppState; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
        }
      )
      // .do(s => console.log(s)) // 別にこれは要らない。ストリームの中間で値がどうなっているか確認したいときに使う。
      .subscribe(appState => { // "rxjs subscribe"でググる。
        // このStateKeeperクラスのインスタンスはAngular2のbootstrap()時にComponentと紐付けられている。
        // そしてstateSubjectのnextはAngular2のChangeDetection機構のOnPushへ通達され、Componentの更新をトリガーすることとなる。
        this.stateSubject.next(appState); // "rxjs subject next"でググる。Componentは更新された状態をstateプロパティを通してリードオンリーで受け取る。
      });
  }

  get state$() { // Componentで状態を取得するときはこれを通じて取得する。stateSubjectはprivateなのでリードオンリーとなる。
    return this.stateSubject as Observable<AppState>; // Component側で参照したときに見慣れたObservableになっているという親切設計。
  }
}