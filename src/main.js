"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var browser_1 = require('angular2/platform/browser');
var core_1 = require('angular2/core');
// import {Observable, Observer} from 'rxjs/Observable';
var Observable_1 = require('rxjs/Observable');
var Subject_1 = require('rxjs/Subject');
var BehaviorSubject_1 = require('rxjs/subject/BehaviorSubject');
require('rxjs/add/operator/map');
require('rxjs/add/operator/scan');
require('rxjs/add/operator/zip');
require('rxjs/add/operator/do');
require('rxjs/add/observable/zip');
// -- helpers
/*
  あまり気に留めなくて良いヘルパー関数群。楽勝。
*/
function merge(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) {
        obj3[attrname] = obj1[attrname];
    }
    for (var attrname in obj2) {
        obj3[attrname] = obj2[attrname];
    }
    return obj3;
}
function getVisibleTodos(todos, filter) {
    return todos.filter(function (todo) {
        if (filter === "SHOW_ACTIVE") {
            return !todo.completed;
        }
        if (filter === "SHOW_COMPLETED") {
            return todo.completed;
        }
        return true; // 上記以外なら全て返す。
    });
}
// -- actions
/*
  Reduxの要、アクション。とにかく理解するのが大変。DIにより挙動が変わる。
*/
var AddTodoAction = (function () {
    function AddTodoAction(todoId, text) {
        this.todoId = todoId;
        this.text = text;
    }
    return AddTodoAction;
}());
var ToggleTodoAction = (function () {
    function ToggleTodoAction(id) {
        this.id = id;
    }
    return ToggleTodoAction;
}());
var SetVisibilityFilter = (function () {
    function SetVisibilityFilter(filter) {
        this.filter = filter;
    }
    return SetVisibilityFilter;
}());
// -- statefn
/*
  状態管理をする関数。stateFnは特に重要。興味を持ったもののここで挫ける人が多数いそう。
*/
// stateFn関数のヘルパー。Observableを返しているのがポイント。
function todosStateObserver(initState, actions) {
    // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
    return actions.scan(function (todos, action) {
        if (action instanceof AddTodoAction) {
            var newTodo = {
                id: action.todoId,
                text: action.text,
                completed: false
            };
            return todos.concat([newTodo]); // ...todosは配列を展開している。
        }
        else {
            return todos.map(function (todo) {
                if (action instanceof ToggleTodoAction) {
                    return (action.id !== todo.id) ? todo : merge(todo, { completed: !todo.completed });
                }
                else {
                    return todo;
                }
            });
        }
    }, initState);
}
// stateFn関数のヘルパー。Observableを返しているのがポイント。
function filterStateObserver(initState, actions) {
    // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
    return actions.scan(function (filter, action) {
        if (action instanceof SetVisibilityFilter) {
            return action.filter;
        }
        else {
            return filter;
        }
    }, initState);
}
// 超重要。ただし理解は困難。最初に一度だけ呼ばれてイベントリスナーを登録する。後述するdispatcherが引数actionsにクロージャされるのが最重要ポイント。(という解釈)
// 上記2つのヘルパー関数を監視してzipでまとめてsubscribeする。
// ここはオリジナルのソースから結構書き換えた。自分なりに読みやすい形にしたかったので。特にRxjsのイベントリスナーはObservableで始まってsubscribeで終わった方が見通しが良い。
function stateFn(initState, actions) {
    var subject = new BehaviorSubject_1.BehaviorSubject(initState); // "rxjs BehaviorSubject"でググる。
    // Actionがトリガーされる度にこのSubscriptionが反応する。いわゆるイベントリスナー。
    // Viewでdispatcher.next()が実行されたとき、stateFn()の引数actionsにActionがemitされ(変更され)、つられてSubscriptionが反応する。僕はそう解釈した。
    Observable_1.Observable
        .zip(// "rxjs zip"でググる。
    todosStateObserver(subject.value.todos, actions), // dispatcherが変更されるとactionsが変更されてここが発火する。(多分)
    filterStateObserver(subject.value.visibilityFilter, actions), // dispatcherが変更されるとactionsが変更されてここが発火する。(多分)
    function (todos, visibilityFilter) {
        return { todos: todos, visibilityFilter: visibilityFilter }; // {'todos':todos,'visibilityFilter':visibilityFilter}の省略形。
    })
        .subscribe(function (appState) {
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
var INIT_STATE = new core_1.OpaqueToken("initState"); // "angular2 opaquetoken"でググる。
var DISPATCHER = new core_1.OpaqueToken("dispatcher");
var STATE = new core_1.OpaqueToken("state");
// 最後の方に出てくるTodoAppコンポーネントのprovidersにセットしており、bootstrap()時に実体化される。(@laco0416 さんありがとう！)
// stateFn()のインスタンスを生成するときにinitStateとdispatcherを引数にあてている(クロージャしている)ので、
// 後述するdispatcher.next()がコールされたときにstateFn()内部へ伝播してObservableイベント(Subscription)を強制発火させている。(という個人的な解釈)
var stateAndDispatcher = [
    core_1.provide(INIT_STATE, { useValue: { todos: [], visibilityFilter: 'SHOW_ALL' } }),
    core_1.provide(DISPATCHER, { useValue: new Subject_1.Subject(null) }),
    core_1.provide(STATE, { useFactory: stateFn, deps: [new core_1.Inject(INIT_STATE), new core_1.Inject(DISPATCHER)] }) // 前の2行をstateFn関数の引数とする。stateFnの引数actionsにdispatcherをクロージャしている。(多分)
];
// -- Components
/*
  コンポーネント群。View描画に必要なもの。
  重要なのは@Inject()が書いてある行とそれらが影響している箇所だけだ。その他は流し読みで構わない。
  3か所出てくるthis.dispatcher.next()が一体何をしているのか、内部で何が起きているのか、僕は最後までそれを理解するのに苦労した。
*/
// TodoListコンポーネントの子コンポーネント。
var TodoComponent = (function () {
    function TodoComponent() {
        this.toggle = new core_1.EventEmitter();
    }
    Object.defineProperty(TodoComponent.prototype, "textEffect", {
        get: function () {
            return this.completed ? 'line-through' : 'none';
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], TodoComponent.prototype, "text", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Boolean)
    ], TodoComponent.prototype, "completed", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], TodoComponent.prototype, "toggle", void 0);
    TodoComponent = __decorate([
        core_1.Component({
            selector: 'todo',
            template: "\n    <span (click)=\"toggle.next()\" [style.textDecoration]=\"textEffect\">\n      {{text}}\n    </span>\n  "
        }), 
        __metadata('design:paramtypes', [])
    ], TodoComponent);
    return TodoComponent;
}());
// TodoAppコンポーネントの子コンポーネント。
var TodoListComponent = (function () {
    function TodoListComponent(dispatcher, // ObservableではなくObservaer。
        state) {
        this.dispatcher = dispatcher;
        this.state = state;
    }
    Object.defineProperty(TodoListComponent.prototype, "filtered", {
        get: function () {
            return this.state.map(function (state) {
                return getVisibleTodos(state.todos, state.visibilityFilter);
            });
        },
        enumerable: true,
        configurable: true
    });
    TodoListComponent.prototype.emitToggle = function (id) {
        this.dispatcher.next(new ToggleTodoAction(id)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにToggleTodoActionをemitしていると同時にObservableイベントを強制発火させている。
    };
    TodoListComponent = __decorate([
        core_1.Component({
            selector: 'todo-list',
            template: "\n    <todo *ngFor=\"#t of filtered|async\"\n      [text]=\"t.text\" [completed]=\"t.completed\"\n      (toggle)=\"emitToggle(t.id)\"></todo>\n  ",
            directives: [TodoComponent]
        }),
        __param(0, core_1.Inject(DISPATCHER)),
        // ObservableではなくObservaer。
        __param(1, core_1.Inject(STATE)), 
        __metadata('design:paramtypes', [Object, Observable_1.Observable])
    ], TodoListComponent);
    return TodoListComponent;
}());
var nextId = 0;
// TodoAppコンポーネントの子コンポーネント。
var AddTodoComponent = (function () {
    function AddTodoComponent(dispatcher // ObservableではなくObservaer。
        ) {
        this.dispatcher = dispatcher;
    }
    AddTodoComponent.prototype.addTodo = function (value) {
        this.dispatcher.next(new AddTodoAction(nextId++, value)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにAddTodoActionをemitしていると同時にObservableイベントを強制発火させている。
    };
    AddTodoComponent = __decorate([
        core_1.Component({
            selector: 'add-todo',
            template: "\n    <input #text><button (click)=\"addTodo(text.value)\">Add Todo</button>\n  "
        }),
        __param(0, core_1.Inject(DISPATCHER)), 
        __metadata('design:paramtypes', [Object])
    ], AddTodoComponent);
    return AddTodoComponent;
}());
// Footerコンポーネントの子コンポーネント。
var FilterLinkComponent = (function () {
    function FilterLinkComponent(dispatcher, // ObservableではなくObservaer。
        state) {
        this.dispatcher = dispatcher;
        this.state = state;
    }
    Object.defineProperty(FilterLinkComponent.prototype, "textEffect", {
        // 選択中のフィルター名にアンダーラインを引く。
        get: function () {
            var _this = this;
            return this.state.map(function (state) {
                return state.visibilityFilter === _this.filter ? 'underline' : 'none';
            });
        },
        enumerable: true,
        configurable: true
    });
    FilterLinkComponent.prototype.setVisibilityFilter = function () {
        this.dispatcher.next(new SetVisibilityFilter(this.filter)); // Subjectのnext()をコールすることで即座にストリームを流している。つまりstateFn()の引数actionsにAddTodoActionをemitしていると同時にObservableイベントを強制発火させている。
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', String)
    ], FilterLinkComponent.prototype, "filter", void 0);
    FilterLinkComponent = __decorate([
        core_1.Component({
            selector: 'filter-link',
            template: "\n    <a href=\"#\" (click)=\"setVisibilityFilter()\"\n      [style.textDecoration]=\"textEffect|async\"><ng-content></ng-content></a>\n  "
        }),
        __param(0, core_1.Inject(DISPATCHER)),
        // ObservableではなくObservaer。
        __param(1, core_1.Inject(STATE)), 
        __metadata('design:paramtypes', [Object, Observable_1.Observable])
    ], FilterLinkComponent);
    return FilterLinkComponent;
}());
// TodoAppコンポーネントの子コンポーネント。
var FooterComponent = (function () {
    function FooterComponent() {
    }
    FooterComponent = __decorate([
        core_1.Component({
            selector: 'footer',
            template: "\n    <filter-link filter=\"SHOW_ALL\">All</filter-link>\n    <filter-link filter=\"SHOW_ACTIVE\">Active</filter-link>\n    <filter-link filter=\"SHOW_COMPLETED\">Completed</filter-link>\n  ",
            directives: [FilterLinkComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], FooterComponent);
    return FooterComponent;
}());
// 最上位のコンポーネント。
var TodoApp = (function () {
    function TodoApp() {
    }
    TodoApp = __decorate([
        core_1.Component({
            selector: 'ng-demo',
            template: "\n    <add-todo></add-todo>\n    <todo-list></todo-list>\n    <footer></footer>\n  ",
            directives: [AddTodoComponent, TodoListComponent, FooterComponent],
            providers: stateAndDispatcher,
            changeDetection: core_1.ChangeDetectionStrategy.OnPush // Rxjsのpushが全ての状態変更を管轄しているのでこの設定が可能になる。
        }), 
        __metadata('design:paramtypes', [])
    ], TodoApp);
    return TodoApp;
}());
core_1.enableProdMode(); // 動作が2倍くらい速くなる。プロダクション環境では推奨。
browser_1.bootstrap(TodoApp)
    .catch(function (err) { return console.error(err); });
