# savkins-angular2-rxjs-redux

Angular2チームの中の人が書いた
[MANAGING STATE IN ANGULAR 2 APPLICATIONS](http://victorsavkin.com/post/137821436516/managing-state-in-angular-2-applications)
を理解したくてオリジナルのソースにちょこちょこ手を加えながらコメントを入れました。

Redux(Flux)をAngular2向けにRxJSを取り入れながらアレンジしたものらしいです。(通称Savkin's Flux)    
`src2/main.ts`を眺めたら大体理解できるようにしました。(現在は`src2`はメンテしていません。`src3`を参照してください)

RxJSを使うことでOnPushによるChangeDetectionが使えるため処理速度が向上するとのこと。著者であるSavkinの熱量も中々のものです。  
FluxだとかReduxだとかに興味あるけどまだ踏み込めていない人たちへ贈ります。

(後日談)  
ところでこれはSavkinによるオレオレFluxみたいで、本来のFluxとはかなり様子が違うようですのであまり鵜呑みにしないでください。  
僕にとってはFluxの入口がここだったのでツイッターの面々には随分とご迷惑をお掛けしました。  
ただ、Angular2とRxJSとTypeScriptの性能をフルに引き出しているという意味では十分に学ぶ価値のあるサンプルだと思いますので
時間のあるときにでも眺めてみて下さい。

---

(更新)  
オリジナルに近いのは`src/main.ts`ですが、状態(State)管理の仕組みがfunctionで書かれていたのでモダンぽくclassで書き直したのが`src2/main.ts`です。

`src/main.ts`は削除しても良かったのですが、よりオリジナルに近いということと、僕が理解に至るまでの苦悩がちょこちょこコメントに表れているので残します。

---

(更新)  
`src2/main.ts`は1つのファイルに全てを書いていますが、これを細分化したものを`src3`フォルダに作りました。    
Fluxに関するものは`src3/flux`フォルダにまとめましたので目を通しやすいかと思います。  

`src3`ではついでにDispatcherクラスを作成し、View側でDIするときの記述を簡潔にしています。

`config.js`を編集することで`src`も`src2`も動かすことができます。(デフォルトは`src3`)

---

(更新)  
現在は`src3`をメンテしていますが、`src2/main.ts`は1枚のファイルに全てが書かれているため、全体の雰囲気を掴むのには丁度良いかと思います。

---

(更新)  
`src3`はコードやコメントをかなり刷新しています。`src`、`src2`の時とは僕自身の理解度も大きく違っているので、`src3`のコードを見て頂くことを推奨します。

---

### How to setup.
```
npm install
```

### How to run.
```
npm start
```