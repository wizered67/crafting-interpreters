import { Token } from "../token";
import { Expr } from "./expressions";

export enum Node {
  Expression = "Expression",
  Print = "Print",
  Var = "Var",
  Block = "Block",
  If = "If",
  While = "While",
}

export type Statement =
  | ExpressionStatement
  | PrintStatement
  | VarStatement
  | BlockStatement
  | IfStatement
  | WhileStatement;

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

export type IfStatement = {
  kind: Node.If;
  condition: Expr;
  body: Statement;
  elseBody?: Statement;
};

export type WhileStatement = {
  kind: Node.While;
  condition: Expr;
  body: Statement;
};
