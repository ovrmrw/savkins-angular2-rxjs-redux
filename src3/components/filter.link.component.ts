import {Component, Input} from 'angular2/core';

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
    private dispatcher: Dispatcher<Action>, // DispatcherはSubjectを継承したクラス。オリジナルではここはObservaer<Action>になっている。
    private stateKeeper: StateKeeper // StateKeeperからリードオンリーのstateを受け取るためにDIしている。
  ) { }

  // 選択中のフィルター名にアンダーラインを引く。
  // 戻り値がObservableであるためtemplateではasyncパイプを付ける必要がある。"angular2 async pipe"でググる。
  get textEffect() {
    // stateはリードオンリー。mapしているが別にイテレートしているわけではない。Observableを外してるだけ。
    return this.stateKeeper.state$.map<string>((state: AppState) => {
      return state.visibilityFilter === this.filter ? 'underline' : 'none';
    });
  }

  setVisibilityFilter() {
    // dispatcherのnextをコールすることで即座にストリームを流している。(この場合のストリームはRxJS用語)
    // つまりStateKeeperにクロージャされているObservable(scan)内のdispatcherを更新し、scanサイクルを回すトリガーとなる。
    this.dispatcher.next(new SetVisibilityFilter(this.filter)); // "rxjs subject next"でググる。
  }
}