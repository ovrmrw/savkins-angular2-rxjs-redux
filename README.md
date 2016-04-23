# savkins-angular2-rxjs-redux
MANAGING STATE IN ANGULAR 2 APPLICATIONSを僕なりに解釈した。

Angular2チームの中の人が書いた
[MANAGING STATE IN ANGULAR 2 APPLICATIONS](http://victorsavkin.com/post/137821436516/managing-state-in-angular-2-applications)
を理解したくてオリジナルのソースにちょこちょこ手を加えながらコメントを入れた。

ReduxをAngular2向けにRxjsを取り入れながらアレンジしたものらしいです。  
`src2/main.ts`を眺めたら大体理解できるようにしたつもりです。

オリジナルに近いのは`src/main.ts`ですが、状態(State)管理の仕組みがfunctionで書かれていたのでモダンぽくclassで書き直したのが`src2/main.ts`です。

`src/main.ts`は削除しても良かったのですが、よりオリジナルに近いということと、僕が理解に至るまでの苦悩がちょこちょこコメントに表れているので残します。

`config.js`の下半分をコメントアウトすれば`src/main.ts`を動かすこともできます。

Rxjsを使うことでOnPushによるChangeDetectionが使えるため、処理速度が向上するとのこと。著者であるSavkinの熱量も中々のものです。  
FluxだとかReduxだとかに興味あるけどまだ踏み込めていない人達へ。

### How to setup.
```
npm install
```

### How to run.
```
npm start
```