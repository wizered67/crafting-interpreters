import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";

export class Environment {
  private readonly values: Map<string, any> = new Map();

  define(name: string, value: any) {
    this.values.set(name, value);
  }

  get(nameToken: Token): any {
    if (this.values.has(nameToken.lexeme)) {
      return this.values.get(nameToken.lexeme);
    }
    throw new RuntimeError(nameToken, `Undefined variable ${nameToken.lexeme}.`)
  }
}