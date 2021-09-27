import { Token } from "./token";

export enum Node {
  Binary = "Binary",
  Grouping = "Grouping",
  Literal = "Literal",
  Unary = "Unary",
  Expression = "Expression",
  Print = "Print",
}

export type Expr = Binary | Grouping | Literal | Unary;

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

export type Statement = ExpressionStatement | PrintStatement;

export type ExpressionStatement = {
  kind: Node.Expression;
  expression: Expr;
}

export type PrintStatement = {
  kind: Node.Print;
  expression: Expr;
}
