// -- actions
/*
  Reduxの要、アクション。とにかく理解するのが大変。Viewからはこれらを呼ぶことになる。なんで中身が空なの？それでいいんです！
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

export type Action = AddTodoAction | ToggleTodoAction | SetVisibilityFilter; // これ重要。Actionはこの後何回も出てくる。