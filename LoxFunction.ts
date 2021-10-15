import { stmts } from "./ast";
import { LoxCallable, LoxFunctionSignature } from "./ast/value";
import { Environment } from "./environment";

export class LoxFunction extends LoxCallable {
  private readonly declaration: stmts.FunctionStatement;

  constructor(declaration: stmts.FunctionStatement) {
    super();
    this.declaration = declaration;
  }

  call: LoxFunctionSignature = (interpreter, args) => {
    const environment = new Environment(interpreter.globals);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    interpreter.executeBlock(this.declaration.body, environment);
    return null;
  };

  get arity() {
    return this.declaration.params.length;
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}
