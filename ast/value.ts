import { Interpreter } from "../interpreter";

export type LoxValue = string | number | boolean | null | LoxCallable;

export type LoxFunctionSignature = (
  interpreter: Interpreter,
  args: LoxValue[],
) => LoxValue;

export abstract class LoxCallable {
  abstract arity: number;
  abstract call: LoxFunctionSignature;
  abstract toString(): string;
}
