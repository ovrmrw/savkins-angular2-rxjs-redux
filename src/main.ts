import {bootstrap} from 'angular2/platform/browser';
import {Component, OpaqueToken, provide, Inject, Input, Output, EventEmitter, enableProdMode, ChangeDetectionStrategy} from 'angular2/core';
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
  Reduxの要、アクション。とにかく理解するのが大変。DIにより挙動が変わる。
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
type Action = AddTodoAction | ToggleTodoAction | SetVisibilityFilter;


// -- statefn
/*
  状態管理をする関数。stateFnは特に重要。興味を持ったもののここで挫ける人が多数いそう。
*/
// stateFn関数のヘルパー。Observableを返しているのがポイント。
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

// stateFn関数のヘルパー。Observableを返しているのがポイント。
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

// 超重要。ただし理解は困難。最初に一度だけ呼ばれてイベントリスナーを登録する。後述するdispatcherが引数actionsにクロージャされるのが最重要ポイント。(という解釈)
// 上記2つのヘルパー関数を監視してzipでまとめてsubscribeする。
// ここはオリジナルのソースから結構書き換えた。自分なりに読みやすい形にしたかったので。特にRxjsのイベントリスナーはObservableで始まってsubscribeで終わった方が見通しが良い。
function stateFn(initState: AppState, actions: Observable<Action>): Observable<AppState> {
  const subject = new BehaviorSubject(initState); // "rxjs BehaviorSubject"でググる。

  // Actionがトリガーされる度にこのSubscriptionが反応する。いわゆるイベントリスナー。
  // Viewでdispatcher.next()が実行されたとき、stateFn()の引数actionsにActionがemitされ(変更され)、つられてSubscriptionが反応する。僕はそう解釈した。
  Observable
    .zip<AppState>( // "rxjs zip"でググる。
      todosStateObserver(subject.value.todos, actions), // dispatcherが変更されるとactionsが変更されてここが発火する。(多分)
      filterStateObserver(subject.value.visibilityFilter, actions), // dispatcherが変更されるとactionsが変更されてここが発火する。(多分)
      (todos, visibilityFilter) => { // zipが返す値を整形できる。
        return { todos, visibilityFilter } as AppState; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
      }
    )
    // .do(s => console.log(s)) // 別にこれは要らない。ストリームの中間で値がどうなっているか確認したいときに使う。
    .subscribe(appState => {
      subject.next(appState); // "rxjs subject next"でググる。subject.next()により状態が更新される。Viewは更新された状態をリードオンリーで受け取る。
    });

  return subject;
}


// -- DI config
/*
  DI設定。Fluxの要。よくわからない。特にdispatcherがよくわからない。難しい。こんなことを考案したのは一体誰だ。
  それでもここが理解できないとSavkin's Redux with RxJSは理解できない。調べるにあたっては英語力とググり能力が試される最大の難所と言っても良い。
  https://laco0416.github.io/post/platform-prividers-of-angular-2/ を参考にすると理解の助けになるかもしれない。
*/
const INIT_STATE = new OpaqueToken("initState"); // "angular2 opaquetoken"でググる。
const DISPATCHER = new OpaqueToken("dispatcher");
const STATE = new OpaqueToken("state");

// 最後の方に出てくるTodoAppコンポーネントのprovidersにセットしており、bootstrap()時に実体化される。(@laco0416 さんありがとう！)
// stateFn()のインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// 後述するdispatcher.next()がコールされたときにstateFn()内部へ伝播してObservableイベント(Subscription)を強制発火させている。(という個人的な解釈)
const stateAndDispatcher = [
  provide(INIT_STATE, { useValue: { todos: [], visibilityFilter: 'SHOW_ALL' } }),
  provide(DISPATCHER, { useValue: new Subject<Action>(null) }), // ObservableではなくSubjectである。SubjectはObservableでもありObserverでもある。そこが重要。(適当)
  provide(STATE, { useFactory: stateFn, deps: [new Inject(INIT_STATE), new Inject(DISPATCHER)] }) // 前の2行をstateFn関数の引数とする。stateFnの引数actionsにdispatcherをクロージャしている。(多分)
];


// -- Components
/* 
  コンポーネント群。View描画に必要なもの。
  重要なのは@Inject()が書いてある行とそれらが影響している箇所だけだ。その他は流し読みで構わない。 
  3か所出てくるthis.dispatcher.next()が一体何をしているのか、内部で何が起きているのか、僕は最後までそれを理解するのに苦労した。
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
    @Inject(STATE) private state: Observable<AppState>
  ) { }

  get filtered() {
    return this.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
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
    @Inject(STATE) private state: Observable<AppState>
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  get textEffect() {
    return this.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  setVisibilityFilter() {
    this.dispatcher.next(new SetVisibilityFilter(this.filter)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにAddTodoActionをemitしていると同時にObservableイベントを強制発火させている。
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
  providers: stateAndDispatcher, // stateAndDispatcherのDIが全ての子コンポーネントに影響する。
  changeDetection: ChangeDetectionStrategy.OnPush // Rxjsのpushが全ての状態変更を管轄しているのでこの設定が可能になる。
})
class TodoApp { }

enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。
bootstrap(TodoApp)
  .catch(err => console.error(err));