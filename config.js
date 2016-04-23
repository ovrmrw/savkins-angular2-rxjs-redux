// これはオリジナル。srcを動かす設定。
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

// src2を動かす設定。これより前のSystem.configを上書きする。
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

// src3を動かす設定。これより前のSystem.configを上書きする。
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