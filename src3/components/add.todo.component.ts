import {Component, Inject} from 'angular2/core';
import {Observer} from 'rxjs/Observer';

import {Action, AddTodoAction} from '../flux/flux-action';
import {Dispatcher} from '../flux/flux-di';


// TodoAppコンポーネントの子コンポーネント。
@Component({
  selector: 'add-todo',
  template: `
    <input #text><button (click)="addTodo(text.value)">Add Todo</button>
  `
})
export class AddTodoComponent {
  nextId = 0;

  constructor(
    private dispatcher: Dispatcher<Action> // オリジナルではここはObservaer<Action>になっている。
  ) { }

  addTodo(value: string) {
    // Subjectのnext()をコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているSubjectのインスタンス(変数actions)にActionをemitすることでObservableイベント(Subscription)を発火させている。
    this.dispatcher.next(new AddTodoAction(this.nextId++, value));
  }
}