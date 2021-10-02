import { Lox } from ".";
import {
  Expr,
  Node,
  Unary,
  Binary,
  ExpressionStatement,
  PrintStatement,
  Statement,
  Variable,
  VarStatement,
} from "./ast";
import { Environment } from "./environment";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Interpreter {
  private environment: Environment = new Environment();

  interpret(statements: Statement[]): any {
    try {
      for (const statement of statements) {
        this.execute(statement);
      }
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
      case Node.Variable:
        return this.interpretVariable(expr);
      case Node.Assignment:
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
      default:
        assertUnreachable(expr);
    }
  }

  private execute(statement: Statement): void {
    switch (statement.kind) {
      case Node.Expression:
        return this.interpretExpressionStatement(statement);
      case Node.Print:
        return this.interpretPrintStatement(statement);
      case Node.Var:
        return this.interpretVariableDeclaration(statement);
      default:
        assertUnreachable(statement);
    }
  }

  private interpretExpressionStatement(stmt: ExpressionStatement): void {
    this.evaluate(stmt.expression);
  }

  private interpretPrintStatement(stmt: PrintStatement): void {
    const value = this.evaluate(stmt.expression);
    console.log(stringify(value));
  }

  private interpretVariableDeclaration(stmt: VarStatement): void {
    const value = stmt.initializer ? this.evaluate(stmt.initializer) : null;
    this.environment.define(stmt.name.lexeme, value);
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

  private interpretVariable(variable: Variable) {
    return this.environment.get(variable.name);
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

function assertUnreachable(value: never) {
  throw new Error("Shouldn't have reached this.");
}
