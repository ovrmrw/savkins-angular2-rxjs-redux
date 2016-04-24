import {Observable} from 'rxjs/Observable';

import {ActionTypeTodo, ActionTypeFilter, AddTodoAction, ToggleTodoAction, SetVisibilityFilter} from './flux-action';


/*
  StateKeeperのconstructorのヘルパー関数群。
  変更の必要があるものだけ値を差し替えて返す。そうでないものはそのまま返す。
  Actionの型に応じて処理が分岐していくのが特徴だが、Actionの数が増えれば増えるほどカオスになる危険性はある。
  if文でinstanceofの判定をすることで型を確定させるのはTypeScriptの特徴的な機能なので覚えておくと良い。
  
  RxJSのscanが使われているのには理由がある。僕は最初この理由がわからなくてmapで代用できるんじゃなかとか思っていた。
  scanのやっていることは配列のreduceみたいなものだが、大きく違うのは一度処理が走った後にそこで終わるのではなく"残り続ける"ことにある。
  そして次にactionの変化に反応して処理が走るとき、"前回の結果から続きを始める"。何を言っているかわかるだろうか。
  つまり時間をまたいでイベントの発生の度にreduceして新しい値を返しているのである。そしてこれはプログラムが終了するまでずっと続くのである。   
*/

// actionsの型はオリジナルではObservable<Action>だがTodoの操作に必要なものだけ絞り込む意味でActionTypeTodoを使っている。
export function todosStateObserver(initTodos: Todo[], actions: Observable<ActionTypeTodo>): Observable<Todo[]> {
  // scanの理解はとても長い道のりである。配列のreduceとは似ているが全く違う。概念の違いだ。RxJSは時間をまたいでreduceする。いずれ理解できるだろう。
  return actions.scan<Todo[]>((todos: Todo[], action: ActionTypeTodo) => { // "rxjs scan"でググる。
    if (action instanceof AddTodoAction) { // actionがAddTodoActionの場合。
      const newTodo = {
        id: action.todoId,
        text: action.text,
        completed: false
      } as Todo;
      console.log(newTodo);
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
export function filterStateObserver(initFilter: string, actions: Observable<ActionTypeFilter>): Observable<string> {
  // scanの理解はとても長い道のりである。配列のreduceとは似ているが全く違う。概念の違いだ。RxJSは時間をまたいでreduceする。いずれ理解できるだろう。
  return actions.scan<string>((filter: string, action: ActionTypeFilter) => { // "rxjs scan"でググる。
    console.log(filter);
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