import {Component} from 'angular2/core';

import {Action, ToggleTodoAction} from '../flux/flux-action';
import {StateKeeper} from '../flux/flux-state';
import {Dispatcher} from '../flux/flux-di';

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
    private dispatcher: Dispatcher<Action>, // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
    private stateKeeper: StateKeeper // StateKeeperからリードオンリーのstateを受け取るためにDIしている。
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