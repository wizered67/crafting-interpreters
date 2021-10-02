import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class Environment {
  private readonly enclosing?: Environment;
  private readonly values: Map<string, any> = new Map();

  constructor(enclosing?: Environment) {
    this.enclosing = enclosing;
  }

  define(name: string, value: any) {
    this.values.set(name, value);
  }

  assign(name: Token, value: any) {
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

  get(nameToken: Token): any {
    if (this.values.has(nameToken.lexeme)) {
      return this.values.get(nameToken.lexeme);
    }
    if (this.enclosing) {
      return this.enclosing.get(nameToken);
    }
    throw new RuntimeError(
      nameToken,
      `Undefined variable ${nameToken.lexeme}.`,
    );
  }
}
