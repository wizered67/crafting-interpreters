import { LoxValue } from "./ast/value";
import { LoxClass } from "./LoxClass";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class LoxInstance {
  private klass: LoxClass;
  private readonly fields: Map<string, LoxValue> = new Map();

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token) {
    const value = this.fields.get(name.lexeme);
    if (value !== undefined) {
      return value;
    }

    throw new RuntimeError(name, `Undefined property ${name.lexeme}.`);
  }

  set(name: Token, value: LoxValue) {
    this.fields.set(name.lexeme, value);
  }

  stringify() {
    return this.klass.name + " instance";
  }
}
