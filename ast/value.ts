import { Interpreter } from "../interpreter";
import { LoxClass } from "../LoxClass";
import { LoxInstance } from "../LoxInstance";

export type LoxValue =
  | string
  | number
  | boolean
  | null
  | LoxCallable
  | LoxClass
  | LoxInstance;

export type LoxFunctionSignature = (
  interpreter: Interpreter,
  args: LoxValue[],
) => LoxValue;

export abstract class LoxCallable {
  abstract arity: number;
  abstract call: LoxFunctionSignature;
  abstract stringify(): string;
}
