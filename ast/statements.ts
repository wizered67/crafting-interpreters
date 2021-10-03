import { Token } from "../token";
import { Expr } from "./expressions";

export enum Node {
  Expression = "Expression",
  Print = "Print",
  Var = "Var",
  Block = "Block",
}

export type Statement =
  | ExpressionStatement
  | PrintStatement
  | VarStatement
  | BlockStatement;

export type ExpressionStatement = {
  kind: Node.Expression;
  expression: Expr;
};

export type PrintStatement = {
  kind: Node.Print;
  expression: Expr;
};

export type VarStatement = {
  kind: Node.Var;
  name: Token;
  initializer: Expr | null;
};

export type BlockStatement = {
  kind: Node.Block;
  statements: Statement[];
};