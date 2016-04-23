import {Component, Inject} from 'angular2/core';
import {Observer} from 'rxjs/Observer';

import {Action, ToggleTodoAction} from '../flux/flux-action';
import {StateKeeper} from '../flux/flux-state';
import {DISPATCHER} from '../flux/flux-di';

import {TodoComponent} from './todo.component';

import {getVisibleTodos} from '../helper';


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
    @Inject(DISPATCHER) private dispatcher: Observer<Action>, // ObservableではなくObservaer。
    private stateKeeper: StateKeeper // この場合@Inject()は省略しても良い。普通は省略する。
  ) { }

  get filtered() {
    return this.stateKeeper.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
      return getVisibleTodos(state.todos, state.visibilityFilter);
    });
  }

  emitToggle(id: number) {
    // Subjectのnext()をコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているSubjectのインスタンス(変数actions)にActionをemitすることでObservableイベント(Subscription)を発火させている。
    this.dispatcher.next(new ToggleTodoAction(id));
  }
}