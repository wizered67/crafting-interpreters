import { Lox } from ".";
import { exprs, stmts } from "./ast";
import { LoxCallable, LoxValue } from "./ast/value";
import { Environment } from "./environment";
import { LoxFunction } from "./LoxFunction";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Interpreter {
  readonly globals = new Environment();
  private environment = this.globals;

  constructor() {
    this.globals.define(
      "clock",
      new (class extends LoxCallable {
        arity = 0;
        toString = () => "<native fn>";
        call = () => Date.now();
      })(),
    );
  }

  interpret(statements: stmts.Statement[]): LoxValue | undefined {
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

  private evaluate(expr: exprs.Expr): LoxValue {
    switch (expr.kind) {
      case exprs.Node.Literal:
        return expr.value;
      case exprs.Node.Unary:
        return this.interpretUnary(expr);
      case exprs.Node.Binary:
        return this.interpretBinary(expr);
      case exprs.Node.Grouping:
        return this.evaluate(expr.expression);
      case exprs.Node.Variable:
        return this.interpretVariable(expr);
      case exprs.Node.Assignment:
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value);
        return value;
      case exprs.Node.Call:
        return this.interpretCall(expr);
      default:
        assertUnreachable(expr);
    }
  }

  private execute(statement: stmts.Statement): void {
    switch (statement.kind) {
      case stmts.Node.Expression:
        return this.interpretExpressionStatement(statement);
      case stmts.Node.Print:
        return this.interpretPrintStatement(statement);
      case stmts.Node.Var:
        return this.interpretVariableDeclaration(statement);
      case stmts.Node.Block:
        return this.executeBlock(
          statement.statements,
          new Environment(this.environment),
        );
      case stmts.Node.If:
        return this.interpretIf(statement);
      case stmts.Node.While:
        return this.interpretWhile(statement);
      case stmts.Node.Function:
        return this.interpretFunctionDeclaration(statement);
      default:
        assertUnreachable(statement);
    }
  }

  executeBlock(statements: stmts.Statement[], environment: Environment) {
    const previousEnvironment = this.environment;
    try {
      this.environment = environment;
      statements.forEach((stmt) => this.execute(stmt));
    } finally {
      this.environment = previousEnvironment;
    }
  }

  private interpretExpressionStatement(stmt: stmts.ExpressionStatement): void {
    this.evaluate(stmt.expression);
  }

  private interpretPrintStatement(stmt: stmts.PrintStatement): void {
    const value = this.evaluate(stmt.expression);
    console.log(stringify(value));
  }

  private interpretVariableDeclaration(stmt: stmts.VarStatement): void {
    const value = stmt.initializer ? this.evaluate(stmt.initializer) : null;
    this.environment.define(stmt.name.lexeme, value);
  }

  private interpretFunctionDeclaration(stmt: stmts.FunctionStatement): void {
    const func = new LoxFunction(stmt);
    this.environment.define(stmt.name.lexeme, func);
  }

  private interpretIf(stmt: stmts.IfStatement): void {
    if (isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    } else if (stmt.elseBody) {
      this.execute(stmt.elseBody);
    }
  }

  private interpretWhile(stmt: stmts.WhileStatement): void {
    while (isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  private interpretUnary(unary: exprs.Unary): LoxValue {
    const right = this.evaluate(unary.right);
    switch (unary.operator.type) {
      case TokenType.BANG:
        return !isTruthy(right);
      case TokenType.MINUS:
        checkNumberOperand(unary.operator, right);
        return -right;
    }
  }

  private interpretBinary(binary: exprs.Binary): LoxValue {
    if (isLogicalBinary(binary)) {
      return this.interpretLogicalBinary(binary);
    }
    let left = this.evaluate(binary.left);
    let right = this.evaluate(binary.right);
    switch (
      binary.operator.type as Exclude<
        exprs.BinaryOperators,
        TokenType.OR | TokenType.AND
      >
    ) {
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        throw new RuntimeError(
          binary.operator,
          "Operands must be two numbers or two strings.",
        );
      case TokenType.MINUS:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left - right;
      case TokenType.STAR:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left * right;
      case TokenType.SLASH:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left / right;
      case TokenType.EQUAL_EQUAL:
        return left === right;
      case TokenType.BANG_EQUAL:
        return left !== right;
      case TokenType.GREATER:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        [left, right] = checkNumberOperands(binary.operator, left, right);
        return left <= right;
    }
  }

  private interpretLogicalBinary(
    expr: exprs.Binary<TokenType.AND | TokenType.OR>,
  ): LoxValue {
    const left = this.evaluate(expr.left);

    switch (expr.operator.type) {
      case TokenType.OR:
        if (isTruthy(left)) {
          return left;
        }
      case TokenType.AND:
        if (!isTruthy(left)) {
          return left;
        }
    }

    return this.evaluate(expr.right);
  }

  private interpretVariable(variable: exprs.Variable) {
    return this.environment.get(variable.name);
  }

  private interpretCall(call: exprs.Call) {
    const callee = this.evaluate(call.callee);
    const args = call.args.map((arg) => this.evaluate(arg));
    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(
        call.paren,
        "Can only call functions and classes.",
      );
    }
    if (args.length !== callee.arity) {
      throw new RuntimeError(
        call.paren,
        `Expected ${callee.arity} arguments but got ${arguments.length}.`,
      );
    }
    return callee.call(this, args);
  }
}

function checkNumberOperand(
  operator: Token,
  operand: LoxValue,
): asserts operand is number {
  if (typeof operand === "number") return;
  throw new RuntimeError(operator, "Operand must be a number.");
}

function checkNumberOperands(
  operator: Token,
  left: LoxValue,
  right: LoxValue,
): [number, number] {
  if (typeof left === "number" && typeof right === "number") {
    return [left, right];
  }
  throw new RuntimeError(operator, "Operands must be numbers.");
}

function isTruthy(value: LoxValue) {
  return value !== null && value !== false;
}

function stringify(value: LoxValue): string {
  if (value === null) {
    return "nil";
  }
  return `${value}`;
}

function assertUnreachable(value: never): never {
  throw new Error("Shouldn't have reached this.");
}

function isLogicalBinary(
  binary: exprs.Binary,
): binary is exprs.Binary<TokenType.OR | TokenType.AND> {
  return (
    binary.operator.type === TokenType.AND ||
    binary.operator.type === TokenType.OR
  );
}
