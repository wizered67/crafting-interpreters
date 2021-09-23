import { Lox } from ".";
import { Expr, Node, Unary, Binary } from "./ast";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Interpreter {
  interpret(expr: Expr): any {
    try {
      const value = this.evaluate(expr);
      console.log(stringify(value));
    } catch (err) {
      if (err instanceof RuntimeError) {
        Lox.runtimeError(err);
        return;
      }
      throw err;
    }
  }

  private evaluate(expr: Expr): any {
    switch (expr.kind) {
      case Node.Literal:
        return expr.value;
      case Node.Unary:
        return this.interpretUnary(expr);
      case Node.Binary:
        return this.interpretBinary(expr);
      case Node.Grouping:
        return this.evaluate(expr.expression);
    }
  }

  private interpretUnary(unary: Unary) {
    const right = this.evaluate(unary.right);
    switch (unary.operator.type) {
      case TokenType.BANG:
        return !isTruthy(right);
      case TokenType.MINUS:
        checkNumberOperand(unary.operator, right);
        return -right;
    }
  }

  private interpretBinary(binary: Binary) {
    const left = this.evaluate(binary.left);
    const right = this.evaluate(binary.right);
    switch (binary.operator.type) {
      case TokenType.PLUS:
        if (
          (typeof left === "number" && typeof right === "number") ||
          (typeof left === "string" && typeof right === "string")
        ) {
          return (left as any) + right;
        }
        throw new RuntimeError(
          binary.operator,
          "Operands must be two numbers or two strings.",
        );
      case TokenType.MINUS:
        checkNumberOperands(binary.operator, left, right);
        return left - right;
      case TokenType.STAR:
        checkNumberOperands(binary.operator, left, right);
        return left * right;
      case TokenType.SLASH:
        checkNumberOperands(binary.operator, left, right);
        return left / right;
      case TokenType.EQUAL_EQUAL:
        return left === right;
      case TokenType.BANG_EQUAL:
        return left !== right;
      case TokenType.GREATER:
        checkNumberOperands(binary.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        checkNumberOperands(binary.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        checkNumberOperands(binary.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        checkNumberOperands(binary.operator, left, right);
        return left <= right;
    }
  }
}

function checkNumberOperand(operator: Token, operand: any) {
  if (typeof operand === "number") return;
  throw new RuntimeError(operator, "Operand must be a number.");
}

function checkNumberOperands(operator: Token, left: any, right: any) {
  if (typeof left === "number" && typeof right === "number") {
    return;
  }
  throw new RuntimeError(operator, "Operands must be numbers.");
}

function isTruthy(value: any) {
  return value === null || value === false;
}

function stringify(value: any): string {
  if (value === null) {
    return "nil";
  }
  return `${value}`;
}
