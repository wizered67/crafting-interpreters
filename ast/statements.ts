import { Token } from "../token";
import { Expr, Variable } from "./expressions";

export enum Node {
  Expression = "Expression",
  Print = "Print",
  Var = "Var",
  Function = "Function",
  Block = "Block",
  If = "If",
  While = "While",
  Return = "Return",
  Class = "Class",
}

export type Statement =
  | ExpressionStatement
  | PrintStatement
  | VarStatement
  | BlockStatement
  | IfStatement
  | WhileStatement
  | FunctionStatement
  | ReturnStatement
  | ClassStatement;

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

export type FunctionStatement = {
  kind: Node.Function;
  name: Token;
  params: Token[];
  body: Statement[];
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

export type ReturnStatement = {
  kind: Node.Return;
  keyword: Token;
  value?: Expr;
};

export type ClassStatement = {
  kind: Node.Class;
  name: Token;
  superclass?: Variable;
  methods: FunctionStatement[];
};
