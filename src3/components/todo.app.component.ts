import {Component, ChangeDetectionStrategy} from 'angular2/core';

import {stateAndDispatcher} from '../flux/flux-di';

import {AddTodoComponent} from './add.todo.component';
import {TodoListComponent} from './todo.list.component';
import {FooterComponent} from './footer.component';


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
export class TodoApp { }