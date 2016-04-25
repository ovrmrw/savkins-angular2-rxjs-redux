import {Component} from 'angular2/core';

import {Action, ToggleTodoAction} from '../flux/flux-action';
import {StateKeeper} from '../flux/flux-state';
import {Dispatcher} from '../flux/flux-di';

import {TodoComponent} from './todo.component';


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
export class TodoListComponent {
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