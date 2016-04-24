import {Component} from 'angular2/core';

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
  private nextId = 0;

  constructor(
    private dispatcher: Dispatcher<Action> // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
  ) { }

  addTodo(value: string) {
    // Subjectのnext()をコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているSubjectのインスタンス(変数actions)にActionをemitすることでObservableイベント(Subscription)を発火させている。
    this.dispatcher.next(new AddTodoAction(this.nextId++, value)); // "rxjs subject next"でググる。
  }
}