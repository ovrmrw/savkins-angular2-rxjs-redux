// -- actions
/*
  Fluxの要、アクション。とにかく理解するのが大変。Viewからはこれらを呼ぶことになる。なんで中身が空なの？それでいいんです！
*/
export class AddTodoAction {
  constructor(public todoId: number, public text: string) { }
}
export class ToggleTodoAction {
  constructor(public id: number) { }
}
export class SetVisibilityFilter {
  constructor(public filter: string) { }
}

// これら2つはflux-state.helper.tsで使われる。必要なものだけを見せるという配慮。
export type ActionTypeTodo = AddTodoAction | ToggleTodoAction; // Todoに関するアクションを束ねたもの。
export type ActionTypeFilter = SetVisibilityFilter; // Filterに関するアクションを束ねたもの。

// これはあらゆる場所で使われる。超重要。
export type Action = ActionTypeTodo | ActionTypeFilter; // 全てのアクションを束ねたもの。Actionはこの後何回も出てくる。