import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/subject/BehaviorSubject';

import {Action, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';

import {merge} from '../helper';


// -- statefn
/*
  状態管理をする関数。オリジナルのstateFnがfunctionだったので全面的にclassに書き直した。ついでに名前をStateKeeperとした。
  classにすることで見通しが良くなり、扱いも簡単になる。特にViewでDIするときに@Inject()が不要になる。
*/
// @Injectable() // Injectableはインスタンス生成をInjectorに任せる場合に必須。このサンプルではtoFactoryで生成するので不要。(@laco0416 さんありがとう！)
export class StateKeeper {
  private subject: BehaviorSubject<AppState>; // "rxjs behaviorsubject"でググる。初期値を持てるのがポイント。

  constructor(initState: AppState, actions: Observable<Action>) { // actionsの型はDispatcher<Action>でも良い。
    this.subject = new BehaviorSubject(initState); // BehaviorSubjectに初期値をセットする。

    // イベント発生毎にsubjectの内容を更新するイベントリスナー。そう、これはイベントリスナーだ。
    // Observableで始まりsubscribeで終わるイベントリスナー(僕はSubscriptionと呼ぶ)はRxJSの基本なので覚えよう。
    // このSubscriptionはViewでActionをemitしたとき(dispatcher.next()がコールされたとき)に、内包されているactionsの変更を検知して発火する。これ重要。
    Observable
      .zip<AppState>( // "rxjs zip"でググる。
        todosStateObserver(this.subject.value.todos, actions), // dispatcher.next()によりActionがemitされるとactionsの変更を検知してここが発火する。
        filterStateObserver(this.subject.value.visibilityFilter, actions), //  〃
        (todos, visibilityFilter) => { // zipが返す値を整形できる。
          return { todos, visibilityFilter } as AppState; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
        }
      )
      // .do(s => console.log(s)) // 別にこれは要らない。ストリームの中間で値がどうなっているか確認したいときに使う。
      .subscribe(appState => {
        this.subject.next(appState); // "rxjs subject next"でググる。subject.next()により状態が更新される。Viewは更新された状態をstateプロパティを通してリードオンリーで受け取る。
      });
  }

  get state() { // Viewで状態を取得するときはこれを通じて取得する。this.subjectはprivateなのでリードオンリーとなる。
    return this.subject; // オリジナルに沿うならas Observable<AppState>を付けても良い。
  }
}


// StateKeeperのconstructorのヘルパー関数。
function todosStateObserver(initState: Todo[], actions: Observable<Action>): Observable<Todo[]> {
  // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan((todos: Todo[], action: Action) => { // "rxjs scan"でググる。
    if (action instanceof AddTodoAction) { // これによりactionは型が確定する。
      const newTodo = {
        id: action.todoId,
        text: action.text,
        completed: false
      } as Todo;
      return [...todos, newTodo]; // ...todosは配列を展開している。
    } else {
      return todos.map(todo => {
        if (action instanceof ToggleTodoAction) { // これによりactionは型が確定する。
          return (action.id !== todo.id) ? todo : merge(todo, { completed: !todo.completed });
        } else {
          return todo;
        }
      });
    }
  }, initState);
}

// StateKeeperのconstructorのヘルパー関数。
function filterStateObserver(initState: string, actions: Observable<Action>): Observable<string> {
  // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan((filter: string, action: Action) => { // "rxjs scan"でググる。
    if (action instanceof SetVisibilityFilter) { // これによりactionは型が確定する。
      return action.filter;
    } else {
      return filter;
    }
  }, initState);
}