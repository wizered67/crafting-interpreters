import { Token } from "./token";

export enum Node {
  Binary = "Binary",
  Grouping = "Grouping",
  Literal = "Literal",
  Unary = "Unary",
  Variable = "Variable",
  Expression = "Expression",
  Print = "Print",
  Var = "Var",
  Assignment = "Assignment",
  Block = "Block",
}

export type Expr = Binary | Grouping | Literal | Unary | Variable | Assignment;

export type Binary = {
  kind: Node.Binary;
  left: Expr;
  operator: Token;
  right: Expr;
};

export type Grouping = {
  kind: Node.Grouping;
  expression: Expr;
};

export type Literal = {
  kind: Node.Literal;
  value: any;
};

export type Unary = {
  kind: Node.Unary;
  operator: Token;
  right: Expr;
};

export type Variable = {
  kind: Node.Variable;
  name: Token;
};

export type Assignment = {
  kind: Node.Assignment;
  name: Token;
  value: Expr;
};

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
