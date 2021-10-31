import { LoxCallable, LoxFunctionSignature } from "./ast/value";
import { LoxInstance } from "./LoxInstance";

export class LoxClass extends LoxCallable {
  readonly name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  stringify() {
    return this.name;
  }

  call: LoxFunctionSignature = (interpreter, args) => {
    const instance = new LoxInstance(this);
    return instance;
  };

  get arity() {
    return 0;
  }
}
