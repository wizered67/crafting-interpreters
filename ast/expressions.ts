import { Token } from "../token";
import { TokenType } from "../tokenType";
import { LoxValue } from "./value";

export enum Node {
  Binary = "Binary",
  Grouping = "Grouping",
  Literal = "Literal",
  Unary = "Unary",
  Variable = "Variable",
  Assignment = "Assignment",
}

export type Expr = Binary | Grouping | Literal | Unary | Variable | Assignment;

export type BinaryOperators =
  | TokenType.PLUS
  | TokenType.MINUS
  | TokenType.SLASH
  | TokenType.STAR
  | TokenType.LESS
  | TokenType.LESS_EQUAL
  | TokenType.GREATER
  | TokenType.GREATER_EQUAL
  | TokenType.EQUAL_EQUAL
  | TokenType.BANG_EQUAL;

export type Binary = {
  kind: Node.Binary;
  left: Expr;
  operator: Token<BinaryOperators>;
  right: Expr;
};

export type Grouping = {
  kind: Node.Grouping;
  expression: Expr;
};

export type Literal = {
  kind: Node.Literal;
  value: LoxValue;
};

export type UnaryOperators = TokenType.BANG | TokenType.MINUS;

export type Unary = {
  kind: Node.Unary;
  operator: Token<UnaryOperators>;
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
