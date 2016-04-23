// こっちはオリジナル。
System.config({
  //use typescript for compilation
  transpiler: 'typescript',
  //typescript compiler options
  typescriptOptions: {
    emitDecoratorMetadata: true
  },
  //map tells the System loader where to look for things
  map: {
    app: "./src"
  },
  //packages defines our app package
  packages: {
    app: {
      main: './main.ts',
      defaultExtension: 'ts'
    }
  }
});

// 元々書いてあったSystem.configを上書きしている。
System.config({
  transpiler: 'typescript',
  typescriptOptions: {
    emitDecoratorMetadata: true
  },
  map: {
    app: "./src2" // app: "./src"
  },
  packages: {
    app: {
      main: './main.ts',
      defaultExtension: 'ts'
    }
  }
});

// ここから下のコメントアウトを外すとsrc3フォルダで動作する。src3はsrc2/main.tsの内容を細分化しただけでやってることは同じ。
System.config({
  transpiler: 'typescript',
  typescriptOptions: {
    emitDecoratorMetadata: true
  },
  map: {
    app: "./src3" // app: "./src"
  },
  packages: {
    app: {
      main: './boot.ts',
      defaultExtension: 'ts'
    }
  }
});