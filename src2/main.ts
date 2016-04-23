import {bootstrap} from 'angular2/platform/browser';
import {Component, OpaqueToken, bind, Inject, Input, Output, EventEmitter, enableProdMode, ChangeDetectionStrategy, Injectable} from 'angular2/core';
// import {Observable, Observer} from 'rxjs/Observable';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/subject/BehaviorSubject';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/zip';
import 'rxjs/add/operator/do';
import 'rxjs/add/observable/zip';


// -- helpers
/*
  あまり気に留めなくて良いヘルパー関数群。楽勝。
*/
function merge<T>(obj1: T, obj2: {}): T {
  let obj3 = {};
  for (let attrname in obj1) {
    obj3[attrname] = obj1[attrname];
  }
  for (let attrname in obj2) {
    obj3[attrname] = obj2[attrname];
  }
  return obj3 as T;
}

function getVisibleTodos(todos: Todo[], filter: string): Todo[] {
  return todos.filter(todo => {
    if (filter === "SHOW_ACTIVE") { // filterがSHOW_ACTIVEならcompletedがfalseのものだけ返す。
      return !todo.completed;
    }
    if (filter === "SHOW_COMPLETED") { // filterがSHOW_COMPLETEDならcompletedがtrueのものだけ返す。
      return todo.completed;
    }
    return true; // 上記以外なら全て返す。
  });
}


// -- state
/* 
  状態管理のためのインターフェース。アクション発生毎にこれらが更新される。
  また更新を全てRxjs(onpush)に委ねることでChangeDetectionStrategy.OnPushが使えるようになる。これはデフォルトよりも処理が速い。
*/
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
interface AppState {
  todos: Todo[];
  visibilityFilter: string;
}


// -- actions
/*
  Reduxの要、アクション。とにかく理解するのが大変。Viewからはこれらを呼ぶことになる。なんで中身が空なの？それでいいんです！
*/
class AddTodoAction {
  constructor(public todoId: number, public text: string) { }
}
class ToggleTodoAction {
  constructor(public id: number) { }
}
class SetVisibilityFilter {
  constructor(public filter: string) { }
}
type Action = AddTodoAction | ToggleTodoAction | SetVisibilityFilter; // これ重要。Actionはこの後何回も出てくる。


// -- statefn
/*
  状態管理をする関数。オリジナルのstateFnがfunctionだったので全面的にclassに書き直した。ついでに名前をStateKeeperとした。
  classにすることで見通しが良くなり、扱いも簡単になる。
*/
// @Injectable() // 本当は@Injectableが必要だと思うのだけどコメントアウトしても動いた。よくわからない。
class StateKeeper {
  private subject: BehaviorSubject<AppState>; // "rxjs behaviorsubject"でググる。初期値を持てるのがポイント。

  constructor(initState: AppState, actions: Observable<Action>) { // actionsの型はSubject<Action>でも良い。
    this.subject = new BehaviorSubject(initState); // BehaviorSubjectに初期値をセットする。

    // イベント発生毎にsubjectの内容を更新するイベントリスナー。そう、これはイベントリスナーだ。
    // Observableで始まりsubscribeで終わるイベントリスナー(僕はSubscriptionと呼ぶ)はRxJSの基本なので覚えよう。
    // このSubscriptionはViewでActionをemitしたとき(dispatcher.next()がコールされたとき)に、内包されているactionsの変更を検知して発火する。これ重要。
    Observable
      .zip<AppState>( // "rxjs zip"でググる。
        this.todosStateObserver(this.subject.value.todos, actions), // dispatcher.next()によりActionがemitされるとactionsの変更を検知してここが発火する。
        this.filterStateObserver(this.subject.value.visibilityFilter, actions), //  〃
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

  // constructorのヘルパー関数。
  private todosStateObserver(initState: Todo[], actions: Observable<Action>): Observable<Todo[]> {
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

  // constructorのヘルパー関数。
  private filterStateObserver(initState: string, actions: Observable<Action>): Observable<string> {
    // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
    return actions.scan((filter: string, action: Action) => { // "rxjs scan"でググる。
      if (action instanceof SetVisibilityFilter) { // これによりactionは型が確定する。
        return action.filter;
      } else {
        return filter;
      }
    }, initState);
  }
}

// これはオマケ。
// @Injectable() // 本当は@Injectableが必要だと思うのだけどコメントアウトしても動いた。よくわからない。
class Test {
  constructor(private str1: string, private str2: string) {
    this.log();
  }
  log() {
    console.log("test: " + this.str1 + " " + this.str2);
  }
}


// -- DI config
/*
  DI設定。Fluxの要。ViewとLogicを巧妙に分離している。理解に至るまでの道のりは長い。ひたすら難しい。こんなことを考案したのは一体誰だ。
  それでもここが理解できないとSavkin's Redux with RxJS for Angular2は理解できない。調べるにあたっては英語力とググり能力が試される最大の難所と言っても良い。
  https://laco0416.github.io/post/platform-prividers-of-angular-2/ を参考にすると理解の助けになるかもしれない。
  Providerはprovide()で書いても良いが、個人的にはbind()の方が書きやすくて好きだ。
*/
const DISPATCHER = new OpaqueToken("dispatcher"); // "angular2 opaquetoken"でググる。Viewで@Inject()するときに必要。

// 最後の方に出てくるTodoAppコンポーネントのprovidersにセットしており、bootstrap()時にインスタンス化される。(@laco0416 さんありがとう！)
// StateKeeperのインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// 後述するdispatcher.next()がコールされたときにStateKeeper内部へ伝播してObservableイベント(Subscription)を強制発火させている。(という個人的な解釈)
const stateAndDispatcher = [
  bind('initState').toValue({ todos: [], visibilityFilter: 'SHOW_ALL' } as AppState), // Viewから参照しないのでOpaqueTokenは使っていない。
  bind(DISPATCHER).toValue(new Subject<Action>(null)), // 超重要。Viewでnext()をコールすることでStateKeeperクラス内のイベントリスナーを発火させる。
  bind(StateKeeper).toFactory((state, dispatcher) => new StateKeeper(state, dispatcher), ['initState', DISPATCHER]) // toFactoryの第二引数はTokenの配列であることに注意。bootstrap時にTokenを通じて値がStateKeeperの引数にあてられる。
];

// practiceForYouは本編とは関係無い。ただしこれの流れを追うことでAngular2のDIへの理解が深まる。
const practiceForYou = [
  bind('1').toValue('12345'), // Testクラスの第一引数に代入する。
  bind('2').toValue(true), // Testクラスの第二引数に代入する。
  bind(Test).toFactory((s1, s2) => new Test(s1, s2), ['1', '2']) // クラスをtoFactoryで扱うときは第一引数を式にしなければならない。また第二引数はTokenの配列にすること。(値の配列ではない)
];


// -- Components
/* 
  コンポーネント群。View描画に必要なもの。
  重要なのは@Inject()が書いてある行とそれらが影響している箇所だけだ。その他は流し読みで構わない。 
  3ヶ所出てくるthis.dispatcher.next()が一体何をしているのか、内部で何が起きているのか、僕は最後までそれを理解するのに苦労した。
*/
// TodoListコンポーネントの子コンポーネント。
@Component({
  selector: 'todo',
  template: `
    <span (click)="toggle.next()" [style.textDecoration]="textEffect">
      {{text}}
    </span>
  `
})
class TodoComponent {
  @Input() text: string;
  @Input() completed: boolean;
  @Output() toggle = new EventEmitter();

  get textEffect() {
    return this.completed ? 'line-through' : 'none';
  }
}

// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'todo-list',
  template: `
    <todo *ngFor="#t of filtered|async"
      [text]="t.text" [completed]="t.completed"
      (toggle)="emitToggle(t.id)"></todo>
  `,
  directives: [TodoComponent]
})
class TodoListComponent {
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action>, // ObservableではなくObservaer。
    @Inject(StateKeeper) private stateKeeper: StateKeeper // この場合@Inject()は省略しても良い。普通は省略する。
  ) { }

  get filtered() {
    return this.stateKeeper.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
      return getVisibleTodos(state.todos, state.visibilityFilter);
    });
  }

  emitToggle(id: number) {
    this.dispatcher.next(new ToggleTodoAction(id)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにToggleTodoActionをemitしていると同時にObservableイベントを強制発火させている。
  }
}

let nextId = 0;

// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'add-todo',
  template: `
    <input #text><button (click)="addTodo(text.value)">Add Todo</button>
  `
})
class AddTodoComponent {
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action> // ObservableではなくObservaer。
  ) { }

  addTodo(value: string) {
    this.dispatcher.next(new AddTodoAction(nextId++, value)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにAddTodoActionをemitしていると同時にObservableイベントを強制発火させている。
  }
}

// Footerコンポーネントの子コンポーネント。
@Component({
  selector: 'filter-link',
  template: `
    <a href="#" (click)="setVisibilityFilter()"
      [style.textDecoration]="textEffect|async"><ng-content></ng-content></a>
  `
})
class FilterLinkComponent {
  @Input() filter: string;
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action>, // ObservableではなくObservaer。
    @Inject(StateKeeper) private stateKeeper: StateKeeper // この場合@Inject()は省略しても良い。普通は省略する。
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  get textEffect() {
    return this.stateKeeper.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  setVisibilityFilter() {
    this.dispatcher.next(new SetVisibilityFilter(this.filter)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにSetVisibilityFilterをemitしていると同時にObservableイベントを強制発火させている。
  }
}

// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'footer',
  template: `
    <filter-link filter="SHOW_ALL">All</filter-link>
    <filter-link filter="SHOW_ACTIVE">Active</filter-link>
    <filter-link filter="SHOW_COMPLETED">Completed</filter-link>
  `,
  directives: [FilterLinkComponent]
})
class FooterComponent { }

// 最上位のコンポーネント。
@Component({
  selector: 'ng-demo',
  template: `
    <add-todo></add-todo>
    <todo-list></todo-list>
    <footer></footer>
  `,
  directives: [AddTodoComponent, TodoListComponent, FooterComponent],
  providers: [stateAndDispatcher, practiceForYou], // stateAndDispatcherのDIが全ての子コンポーネントに影響する。
  changeDetection: ChangeDetectionStrategy.OnPush // Rxjsのpushが全ての状態変更を管轄しているのでこの設定が可能になる。
})
class TodoApp {
  constructor(
    private test: Test // この行をコメントアウトするとどうなるだろうか？
  ) { }
}

enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。
bootstrap(TodoApp) // TodoAppコンポーネントのprovidersにセットしたProvider達はこのときに一度だけインスタンス化される。
  .catch(err => console.error(err));