import { Token } from "../token";

export enum Node {
  Binary = "Binary",
  Grouping = "Grouping",
  Literal = "Literal",
  Unary = "Unary",
  Variable = "Variable",
  Assignment = "Assignment",
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