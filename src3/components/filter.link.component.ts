import {Component, Input, Inject} from 'angular2/core';
import {Observer} from 'rxjs/Observer';

import {Action, SetVisibilityFilter} from '../flux/flux-action';
import {StateKeeper} from '../flux/flux-state';
import {Dispatcher} from '../flux/flux-di';


// Footerコンポーネントの子コンポーネント。
@Component({
  selector: 'filter-link',
  template: `
    <a href="#" (click)="setVisibilityFilter()"
      [style.textDecoration]="textEffect|async"><ng-content></ng-content></a>
  `
})
export class FilterLinkComponent {
  @Input() filter: string;
  constructor(
    private dispatcher: Dispatcher<Action>, // オリジナルではここはObservaer<Action>になっている。
    private stateKeeper: StateKeeper // この場合@Inject()は省略しても良い。普通は省略する。
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  get textEffect() {
    return this.stateKeeper.state.map((state: AppState) => { // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  setVisibilityFilter() {
    // Subjectのnext()をコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているSubjectのインスタンス(変数actions)にActionをemitすることでObservableイベント(Subscription)を発火させている。
    this.dispatcher.next(new SetVisibilityFilter(this.filter)); 
  }
}