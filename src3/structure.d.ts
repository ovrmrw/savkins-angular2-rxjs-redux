// -- state
/* 
  状態管理のためのインターフェース。アクション発生毎にこれらが更新される。
  また更新を全てRxjs(onpush)に委ねることでChangeDetectionStrategy.OnPushが使えるようになる。これはデフォルトよりも処理が速い。
*/
declare interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

declare interface AppState {
  todos: Todo[];
  visibilityFilter: string;
}