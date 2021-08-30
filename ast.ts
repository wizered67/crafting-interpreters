import { Token } from "./token";

export enum Node {
  Binary = "Binary",
  Grouping = "Grouping",
  Literal = "Literal",
  Unary = "Unary",
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
