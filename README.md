# savkins-angular2-rxjs-redux
MANAGING STATE IN ANGULAR 2 APPLICATIONSを僕なりに解釈した。

Angular2チームの中の人が書いた
[MANAGING STATE IN ANGULAR 2 APPLICATIONS](http://victorsavkin.com/post/137821436516/managing-state-in-angular-2-applications)
を理解したくてオリジナルのソースにちょこちょこ手を加えながらコメントを入れた。

ReduxをAngular2向けにRxjsを取り入れながらアレンジしたものらしいです。  
src/main.ts を眺めたら大体理解できるようにしたつもりです。

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