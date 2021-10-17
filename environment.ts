import { LoxValue } from "./ast/value";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class Environment {
  private readonly enclosing?: Environment;
  private readonly values: Map<string, LoxValue> = new Map();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing;
  }

  define(name: string, value: LoxValue) {
    this.values.set(name, value);
  }

  assign(name: Token, value: LoxValue) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }
    if (this.enclosing) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined varible ${name.lexeme}.`);
  }

  get(nameToken: Token): LoxValue {
    if (this.values.has(nameToken.lexeme)) {
      return this.values.get(nameToken.lexeme)!;
    }
    if (this.enclosing) {
      return this.enclosing.get(nameToken);
    }
    throw new RuntimeError(
      nameToken,
      `Undefined variable ${nameToken.lexeme}.`,
    );
  }

  getAt(distance: number, name: string): LoxValue {
    return this.ancestor(distance).values.get(name)!;
  }

  assignAt(distance: number, name: Token, value: LoxValue) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  private ancestor(distance: number) {
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing!;
    }

    return environment;
  }
}
