import {bootstrap} from 'angular2/platform/browser';
import {Component, bind, Input, Output, EventEmitter, enableProdMode, ChangeDetectionStrategy} from 'angular2/core';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/subject/BehaviorSubject';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/zip';
import 'rxjs/add/operator/do';
import 'rxjs/add/observable/zip';


////////////////////////////////////////////////////////////////////////////////////
// -- state
/* 
  状態管理のためのインターフェース。アクション発生毎にこれらが更新される。
  また更新を全てRxJS(onpush)に委ねることでChangeDetectionStrategy.OnPushが使えるようになる。これはデフォルトよりも処理が速い。
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


////////////////////////////////////////////////////////////////////////////////////
// -- actions
/* 
  Fluxの要、アクション。とにかく理解するのが大変。Componentからはこれらを呼ぶことになる。なんで中身が空なの？それでいいんです！
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

// これら2つはStateKeeperのconstructorのヘルパー関数内で使われる。必要なものだけを見せるという配慮。
type ActionTypeTodo = AddTodoAction | ToggleTodoAction; // Todoに関するアクションを束ねたもの。
type ActionTypeFilter = SetVisibilityFilter; // Filterに関するアクションを束ねたもの。

// これはあらゆる場所で使われる。超重要。
type Action = ActionTypeTodo | ActionTypeFilter; // 全てのアクションを束ねたもの。Actionはこの後何回も出てくる。


////////////////////////////////////////////////////////////////////////////////////
// -- statefn
/*  
  状態(State)管理をするクラス。オリジナルのstateFnがfunctionだったので全面的にclassに書き直した。ついでに名前をStateKeeperとした。
  classにすることで見通しが良くなり、扱いも簡単になる。特にComponentでDIするときに@Inject()が不要になる。
  Angular2のbootstrap()時にインスタンス化されると、変数stateSubjectのnextがChangeDetection機構のOnPushをトリガーしてComponent側で更新が始まる。これが理解できないとSavkin's Fluxは理解できない。
*/

// @Injectable() // Injectableはインスタンス生成をInjectorに任せる場合に必須。このサンプルではtoFactoryで生成するので不要。(@laco0416 さんありがとう！)
class StateKeeper {
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

/*
  StateKeeperのconstructorのヘルパー関数群。
  変更の必要があるものだけ値を差し替えて返す。そうでないものはそのまま返す。
  Actionの型に応じて処理が分岐していくのが特徴だが、Actionの数が増えれば増えるほどカオスになる危険性はある。
  if文でinstanceofの判定をすることで型を確定させるのはTypeScriptの特徴的な機能なので覚えておくと良い。
  
  RxJSのscanが使われているのには理由がある。僕は最初この理由がわからなくてmapで代用できるんじゃなかとか思っていた。
  scanのやっていることは配列のreduceみたいなものだが、大きく違うのは一度処理が走った後にそこで終わるのではなく"残り続ける"ことにある。
  そして次にdispatcherがnextされたとき、"前回の結果から続きを始める"。何を言っているかわかるだろうか。
  つまり時間をまたいでnextの度に畳み込んで新しい値を返しているのである。そしてこれはプログラムが終了するまで(あるいは意図的に終わらせるまで)ずっと続くのである。
  (@bouzuya さんありがとう！)   
*/
// actionsの型はオリジナルではObservable<Action>だがTodoの操作に必要なものだけ絞り込む意味でActionTypeTodoを使っている。
function todosStateObserver(initTodos: Todo[], dispatcher$: Observable<ActionTypeTodo>): Observable<Todo[]> {
  // scanの理解はとても長い道のりである。配列のreduceとは似ているが全く違う。概念の違いだ。RxJSは時間をまたいでreduceする。いずれ理解できるだろう。
  return dispatcher$.scan<Todo[]>((todos: Todo[], action: ActionTypeTodo) => { // "rxjs scan"でググる。
    if (action instanceof AddTodoAction) { // actionがAddTodoActionの場合。
      const newTodo = {
        id: action.todoId,
        text: action.text,
        completed: false
      } as Todo;
      return [...todos, newTodo]; // ...todosは配列を展開している。todos.concat(newTodo)と同等。
    } else if (action instanceof ToggleTodoAction) { // actionがToggleTodoActionの場合。
      return todos.map(todo => { // このmapは配列をイテレートしている。Observableのmapとごっちゃにならないこと。
        return (action.id !== todo.id) ? todo : merge(todo, { completed: !todo.completed });
      });
    } else { // actionがAddTodoActionでもToggleTodoActionでもない場合。
      return todos; // 引数の値をそのまま返す。
    }
  }, initTodos); // 初回実行時にこの値から処理が始まる。その後は"前回の結果の続き"から処理を始める。
}

// actionsの型はオリジナルではObservable<Action>だがFilterの操作に必要なものだけ絞り込む意味でActionTypeFilterを使っている。
function filterStateObserver(initFilter: string, dispatcher$: Observable<ActionTypeFilter>): Observable<string> {
  // Componentでdispatcherをnextしたとき、このscanのサイクルが回る。それ以外では回ることはない。そしてずっとnextを待機する。
  return dispatcher$.scan<string>((filter: string, action: ActionTypeFilter) => { // "rxjs scan"でググる。
    if (action instanceof SetVisibilityFilter) { // actionがSetVisibilityFilterの場合。
      return action.filter;
    } else { // actionがSetVisibilityFilterではない場合。
      return filter; // 引数の値をそのまま返す。
    }
  }, initFilter); // 初回実行時にこの値から処理が始まる。その後は"前回の結果の続き"から処理を始める。
}

// ただのヘルパー。あまり気にしなくて良い。
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


////////////////////////////////////////////////////////////////////////////////////
// -- DI config
/*
  DI設定。Fluxの要。ViewとLogicを巧妙に分離している。理解に至るまでの道のりは長い。ひたすら難しい。こんなことを考案したのは一体誰だ。
  それでもここが理解できないとSavkin's Redux with RxJS for Angular2は理解できない。調べるにあたっては英語力とググり能力が試される最大の難所と言っても良い。
  https://laco0416.github.io/post/platform-prividers-of-angular-2/ を参考にすると理解の助けになるかもしれない。
  Providerはprovide()で書いても良いが個人的にはbind()の方が書きやすくて好きだ。provideはGrunt、bindはGulpみたいな違い。
*/

// RxJSのSubjectクラスを継承してDispatcherクラスを作る。このクラスはDIで使う。
// Dispatcherをクラスとして用意しておくことでComponentのDIに関する記述がシンプルになる。シンプルさは正義である。
class Dispatcher<T> extends Subject<T> { 
  constructor(destination?: Observer<T>, source?: Observable<T>) { // この記述はRxJSのソースからパクった。
    super(destination, source);
  }
}

// TodoAppコンポーネントのprovidersにセットしており、Angular2のbootstrap()時にインスタンス化されComponentに紐付けられる。(@laco0416 さんありがとう！)
// StateKeeperのインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// Componentでdispatcher.next()をコールしたときにStateKeeper内部のObservable(scan)のscanサイクルを回すことができる。
const stateAndDispatcher = [
  bind('initState').toValue({ todos: [], visibilityFilter: 'SHOW_ALL' } as AppState), // Componentから参照しないのでOpaqueTokenは使っていない。
  bind(Dispatcher).toValue(new Dispatcher<Action>(null)), // 超重要。これが全てを一つの輪に紡ぎ上げる。Savkin's Fluxの循環サイクルを理解できたとき、人は悟りを知るだろう。
  bind(StateKeeper).toFactory((state, dispatcher) => new StateKeeper(state, dispatcher), ['initState', Dispatcher]) // toFactoryの第二引数はTokenの配列であることに注意。bootstrap時にTokenを通じて値がStateKeeperの引数にあてられる。
];


////////////////////////////////////////////////////////////////////////////////////
// -- Components
/* 
  コンポーネント群。View描画に必要なもの。
  重要なのはDIが書いてある部分とそれらが影響している箇所だけだ。その他は流し読みで構わない。 
  3ヶ所出てくるthis.dispatcher.next()が一体何をしているのか、連鎖して何が起きているのか、僕は最後までそれを理解するのに苦労した。
  結論から言うとdispatcherのnextは巡り巡ってComponentの更新をしているのである。
*/
// TodoListコンポーネントの子コンポーネント。
@Component({
  selector: 'todo',
  template: `
    <span (click)="toggle.next()" [style.textDecoration]="textEffect">
      {{todo.text}}
    </span>
  `
})
class TodoComponent {
  @Input() todo: Todo;
  @Output() toggle = new EventEmitter(); // "angular2 eventemitter"でググる。

  get textEffect() {
    return this.todo.completed ? 'line-through' : 'none';
  }
}

// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'todo-list',
  template: `
    <todo *ngFor="#t of filtered|async"
      [todo]="t"
      (toggle)="emitToggle(t.id)"></todo>
  `,
  directives: [TodoComponent]
})
class TodoListComponent {
  constructor(
    private dispatcher$: Dispatcher<Action>, // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
    private stateKeeper: StateKeeper // StateKeeperからリードオンリーのstateを受け取るためにDIしている。
  ) { }

  // 戻り値がObservableであるためtemplateではasyncパイプを付ける必要がある。"angular2 async pipe"でググる。
  get filtered() {
    // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
    return this.stateKeeper.state$.map<Todo[]>((state: AppState) => {
      return getVisibleTodos(state.todos, state.visibilityFilter);
    });
  }

  emitToggle(id: number) {
    // dispatcherのnextをコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているObservable(scan)内のdispatcherを更新し、scanサイクルを回すトリガーとなる。
    this.dispatcher$.next(new ToggleTodoAction(id)); // "rxjs subject next"でググる。
  }
}

// ただのヘルパー。あまり気にしなくて良い。
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

// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'add-todo',
  template: `
    <input #text><button (click)="addTodo(text.value)">Add Todo</button>
  `
})
class AddTodoComponent {
  private nextId = 0;

  constructor(
    private dispatcher$: Dispatcher<Action> // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
  ) { }

  addTodo(value: string) {
    // dispatcherのnextをコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているObservable(scan)内のdispatcherを更新し、scanサイクルを回すトリガーとなる。
    this.dispatcher$.next(new AddTodoAction(this.nextId++, value)); // "rxjs subject next"でググる。
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
    private dispatcher$: Dispatcher<Action>, // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
    private stateKeeper: StateKeeper // StateKeeperからリードオンリーのstateを受け取るためにDIしている。
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  // 戻り値がObservableであるためtemplateではasyncパイプを付ける必要がある。"angular2 async pipe"でググる。
  get textEffect() {
    // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
    return this.stateKeeper.state$.map<string>((state: AppState) => {
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  setVisibilityFilter() {
    // dispatcherのnextをコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているObservable(scan)内のdispatcherを更新し、scanサイクルを回すトリガーとなる。
    this.dispatcher$.next(new SetVisibilityFilter(this.filter)); // "rxjs subject next"でググる。
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
  providers: [stateAndDispatcher], // stateAndDispatcherのDIが全ての子コンポーネントに影響する。
  changeDetection: ChangeDetectionStrategy.OnPush // Rxjsのpushが全ての状態変更を管轄しているのでこの設定が可能になる。
})
class TodoApp { }


enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。(@laco0416 さんありがとう！)
bootstrap(TodoApp) // TodoAppコンポーネントのprovidersにセットしたProvider達はこのときに一度だけインスタンス化される。
  .catch(err => console.error(err));
  
  
////////////////////////////////////////////////////////////////////////////////////
// 最後に  
/*
  StateKeeperクラスの下記の一文はSavkinによるアートである。僕の推測も入るが出来る限り詳細に解説したい。
    Observable.zip(ScanObservable, ScanObservable).subscribe(Subject.next());
  (* scanオペレーターをセットしたObservableを便宜上ScanObservableとした)
  
  1. Componentでdispatcher.nextをコールすると2つのScanObservableが1周する。(scanの処理が走る)
  2. ZipObservableはRxJSのInnerSubscriberという仕組みを通じて、内包する2つのScanObservableをsubscribeしている。
  3. 内包する全てのObservableのnextを受けるとZipObservableは次にストリームを流す。(subscribeに処理が移る)
  4. subscribeの中ではComponentのStateを管理しているSubjectのnextをコールして"新しい状態"をSubscriberに伝達する。
  5. 上記4はどこに伝達する？僕の力量では追い切れないが、おそらくbootstrap時に紐付けられたComponentのChangeDetection機構である。
  6. その結果ComponentでStateKeeperのstateを参照している箇所の更新処理が自動的に走ることになる。
  
  SavkinはRxJSのSubjectを2つの場所で実に巧妙に使っている。
  1つはComponentからScanObservableへAction(データ)を送り込む用途として。
    (ComponentでnextしたデータをScanObservableに送る同時にscanを走らせる)
  もう1つは上記でトリガーされた一連の流れの最後でStateをComponentに送り込む用途として。
    (StateKeeperでnextしたデータをComponentに送ると同時にChangeDetection機構のOnPushを通じてViewを更新させる)
    
  重要なのは送り込む先に事前にクロージャしておくことでリモート操作するようにSubjectを使いこなしている点である。
  僕は最初この流れが全く理解できなくてどこで何が起きているのかさっぱりわからなかった。
  しかしこれを理解できた後は、使う使わないに関わらず多くの人がこの仕組みを知った方がいいと考えるようになった。
  
  これを読んでくれた人がRxJSをより使いこなせるようになる、そんな一助になれば幸いです。 
*/