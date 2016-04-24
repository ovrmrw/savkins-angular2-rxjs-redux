import {Observable} from 'rxjs/Observable';

import {ActionTypeTodo, ActionTypeFilter, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';


/*
  StateKeeperのconstructorのヘルパー関数群。
  変更の必要があるものだけ値を差し替えて返す。そうでないものはそのまま返す。
  Actionの型に応じて処理が分岐していくのが特徴だが、Actionの数が増えれば増えるほどカオスになる危険性はある。
  オリジナルではactionsをscanしているが敢えてそうする必要もなさそうだったのでmapで書き換えた。 
  if文でinstanceofの判定をすることで型を確定させるのはTypeScriptの特徴的な機能なので覚えておくと良い。 
*/

// actionsの型はオリジナルではObservable<Action>だがTodoの操作に必要なものだけ絞り込む意味でActionTypeTodoを使っている。
export function todosStateObserver(initTodos: Todo[], actions: Observable<ActionTypeTodo>): Observable<Todo[]> {
  // scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan<Todo[]>((todos: Todo[], action: ActionTypeTodo) => { // "rxjs scan"でググる。
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
  }, initTodos); // 回りくどいことをしているようだがこうやってscanでtodosを内部に送り込まなければならない。
}

// actionsの型はオリジナルではObservable<Action>だがFilterの操作に必要なものだけ絞り込む意味でActionTypeFilterを使っている。
export function filterStateObserver(initFilter: string, actions: Observable<ActionTypeFilter>): Observable<string> {
  // scanしてるけどactionsには一つしか格納されていないので実際はObservableを外しているだけ。
  return actions.scan<string>((filter: string, action: ActionTypeFilter) => { // "rxjs scan"でググる。
    if (action instanceof SetVisibilityFilter) { // actionがSetVisibilityFilterの場合。
      return action.filter;
    } else { // actionがSetVisibilityFilterではない場合。
      return filter; // 引数の値をそのまま返す。
    }
  }, initFilter); // 回りくどいことをしているようだがこうやってscanでfilterを内部に送り込まなければならない。
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