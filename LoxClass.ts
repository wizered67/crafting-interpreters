import { LoxCallable, LoxFunctionSignature } from "./ast/value";
import { LoxFunction } from "./LoxFunction";
import { LoxInstance } from "./LoxInstance";

export class LoxClass extends LoxCallable {
  readonly name: string;
  private readonly methods: Map<string, LoxFunction>;
  readonly superclass: LoxClass | undefined;

  constructor(
    name: string,
    superclass: LoxClass | undefined,
    methods: Map<string, LoxFunction>,
  ) {
    super();
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  stringify() {
    return this.name;
  }

  call: LoxFunctionSignature = (interpreter, args) => {
    const instance = new LoxInstance(this);
    const initializer = this.findMethod("init");
    if (initializer) {
      initializer.bind(instance).call(interpreter, args);
    }
    return instance;
  };

  get arity() {
    const initializer = this.findMethod("init");
    if (!initializer) {
      return 0;
    }
    return initializer.arity;
  }

  findMethod(name: string): LoxFunction | undefined {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }
    if (this.superclass) {
      return this.superclass.findMethod(name);
    }

    return undefined;
  }
}
