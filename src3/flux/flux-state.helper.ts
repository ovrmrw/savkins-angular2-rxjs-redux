import {Observable} from 'rxjs/Observable';

import {Action, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';

import {merge} from '../helper';


/*
  StateKeeperのconstructorのヘルパー関数群。
  変更の必要があるものだけ値を差し替えて返す。そうでないものはそのまま返す。
  Actionの型に応じて処理が分岐していくのが特徴だが、Actionの数が増えれば増えるほどカオスになる危険性はある。
*/
export function todosStateObserver(initState: Todo[], actions: Observable<Action>): Observable<Todo[]> {
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

export function filterStateObserver(initState: string, actions: Observable<Action>): Observable<string> {
  // actions.scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan((filter: string, action: Action) => { // "rxjs scan"でググる。
    if (action instanceof SetVisibilityFilter) { // これによりactionは型が確定する。
      return action.filter;
    } else {
      return filter;
    }
  }, initState);
}