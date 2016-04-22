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

function getVisibleTodos(todos: ITodo[], filter: string): ITodo[] {
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
interface ITodo {
  id: number;
  text: string;
  completed: boolean;
}
interface IAppState {
  todos: ITodo[];
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
// stateFn関数のヘルパー。
function todosStateObserver(initState: ITodo[], actions: Observable<Action>): Observable<ITodo[]> {
  // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan((todos: ITodo[], action: Action) => { // "rxjs scan"でググる。
    if (action instanceof AddTodoAction) { // これによりactionは型が確定する。
      const newTodo = {
        id: action.todoId,
        text: action.text,
        completed: false
      } as ITodo;
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

// stateFn関数のヘルパー。
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

// 超重要。ただし理解は困難。最初に一度だけ呼ばれてイベントリスナーを登録する。
function stateFn(initState: IAppState, actions: Observable<Action>): Observable<IAppState> {
  const subject = new BehaviorSubject(initState); // "rxjs BehaviorSubject"でググる。

  // Actionがトリガーされる度にこのSubscriptionが反応する。いわゆるイベントリスナー。
  // Viewでdispather.next()が実行されたとき、stateFn()の引数actionsが変更され、つられてSubscriptionが反応する。僕はそう解釈した。
  Observable
    .zip( // "rxjs zip"でググる。
      todosStateObserver(subject.value.todos, actions),
      filterStateObserver(subject.value.visibilityFilter, actions),
      (todos, visibilityFilter) => { // zipが返す値を整形できる。
        return { todos, visibilityFilter } as IAppState; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
      }
    )
    .subscribe(appState => {
      subject.next(appState); // "rxjs subject next"でググる。
    });

  return subject;
}


// -- DI config
/*
  DI設定。Fluxの要。よくわからない。特にdispatcherがよくわからない。難しい。こんなことを考案したのは一体誰だ。
*/
const INIT_STATE = new OpaqueToken("initState"); // "angular2 opaquetoken"でググる。
const DISPATCHER = new OpaqueToken("dispatcher");
const STATE = new OpaqueToken("state");

// STATEの中でstateFn関数を呼んでいる。そしてDISPATCHERを依存関係に取り込んでいるので、
// おそらく後述するdispather.next()が呼ばれたときにstateFnでクロージャされたactionsが反応してSubscriptionが反応する仕組みなのだろう。(適当)
const stateAndDispatcher = [
  provide(INIT_STATE, { useValue: { todos: [], visibilityFilter: 'SHOW_ALL' } }),
  provide(DISPATCHER, { useValue: new Subject<Action>(null) }), // ObservableではなくSubjectである。SubjectはObservableでもありObserverでもある。そこが重要。(適当)
  provide(STATE, { useFactory: stateFn, deps: [new Inject(INIT_STATE), new Inject(DISPATCHER)] }) // 前の2行をstateFnの引数とする。Viewではこれを通じてstateを参照する。
];


// -- Components
/* 
  コンポーネント群。View描画に必要なもの。
  重要なのは@Inject()が書いてる行とそれらが影響している箇所だけだ。その他は流し読みで構わない。 
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
class Todo {
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
  directives: [Todo]
})
class TodoList {
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action>,
    @Inject(STATE) private state: Observable<IAppState>
  ) { }

  get filtered() {
    return this.state.map(state => { // stateはリードオンリー。
      return getVisibleTodos(state.todos, state.visibilityFilter);
    });
  }

  emitToggle(id: number) {
    this.dispatcher.next(new ToggleTodoAction(id)); // stateFn()の引数actionsを変更していると同時にイベントをトリガーしている。(多分)
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
class AddTodo {
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action>
  ) { }

  addTodo(value: string) {
    this.dispatcher.next(new AddTodoAction(nextId++, value)); // stateFn()の引数actionsを変更していると同時にイベントをトリガーしている。(多分)
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
class FilterLink {
  @Input() filter: string;
  constructor(
    @Inject(DISPATCHER) private dispatcher: Observer<Action>,
    @Inject(STATE) private state: Observable<IAppState>
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  get textEffect() {
    return this.state.map(state => { // stateはリードオンリー。
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  // DIを通して何かやってる。
  setVisibilityFilter() {
    this.dispatcher.next(new SetVisibilityFilter(this.filter)); // stateFn()の引数actionsを変更していると同時にイベントをトリガーしている。(多分)
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
  directives: [FilterLink]
})
class Footer { }

// 最上位のコンポーネント。
@Component({
  selector: 'ng-demo',
  template: `
    <add-todo></add-todo>
    <todo-list></todo-list>
    <footer></footer>
  `,
  directives: [AddTodo, TodoList, Footer],
  providers: stateAndDispatcher, // stateAndDispatcherのDIが全ての子コンポーネントに影響する。
  changeDetection: ChangeDetectionStrategy.OnPush // Rxjsのpushが全ての状態変更を管轄しているのでこの設定が可能になる。
})
class TodoApp { }


enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。
bootstrap(TodoApp)
  .catch(err => console.error(err));