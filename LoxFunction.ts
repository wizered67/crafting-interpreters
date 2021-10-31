import { stmts } from "./ast";
import { LoxCallable, LoxFunctionSignature, LoxValue } from "./ast/value";
import { Environment } from "./environment";
import { LoxInstance } from "./LoxInstance";

export class LoxFunction extends LoxCallable {
  private readonly closure: Environment;
  private readonly declaration: stmts.FunctionStatement;
  private readonly isInitializer: boolean;

  constructor(
    declaration: stmts.FunctionStatement,
    closure: Environment,
    isInitializer: boolean,
  ) {
    super();
    this.declaration = declaration;
    this.closure = closure;
    this.isInitializer = isInitializer;
  }

  call: LoxFunctionSignature = (interpreter, args) => {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (err) {
      if (err instanceof Return) {
        if (this.isInitializer) {
          return this.closure.getAt(0, "this");
        }
        return err.value;
      }
      throw err;
    }

    if (this.isInitializer) {
      return this.closure.getAt(0, "this");
    }
    return null;
  };

  get arity() {
    return this.declaration.params.length;
  }

  stringify() {
    return `<fn ${this.declaration.name.lexeme}>`;
  }

  bind(instance: LoxInstance) {
    const environment = new Environment(this.closure);
    environment.define("this", instance);
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }
}

export class Return {
  value: LoxValue;
  constructor(value: LoxValue) {
    this.value = value;
  }
}
