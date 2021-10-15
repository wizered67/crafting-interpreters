import { Interpreter } from "../interpreter";

export type LoxValue = string | number | boolean | null | LoxCallable;

type LoxFunction = (interpreter: Interpreter, args: LoxValue[]) => LoxValue;

export class LoxCallable {
  private fn: LoxFunction;
  private name: string;
  arity: number;

  constructor(fn: LoxFunction, arity: number, name: string) {
    this.fn = fn;
    this.arity = arity;
    this.name = name;
  }

  call: LoxFunction = (interpreter, args) => this.fn(interpreter, args);
  toString() {
    return this.name;
  }
}
