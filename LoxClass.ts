import { LoxCallable, LoxFunctionSignature } from "./ast/value";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";
import { Token } from "./token";

export class LoxClass extends LoxCallable {
  readonly name: string;
  private readonly methods: Map<string, LoxFunction>;

  constructor(name: string, methods: Map<string, LoxFunction>) {
    super();
    this.name = name;
    this.methods = methods;
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

  findMethod(name: string) {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }

    return null;
  }
}
