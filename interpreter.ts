import { Lox } from ".";
import { exprs, stmts } from "./ast";
import { LoxCallable, LoxValue } from "./ast/value";
import { Environment } from "./environment";
import { LoxFunction, Return } from "./LoxFunction";
import { RuntimeError } from "./RuntimeError";
import { Token } from "./token";
import { TokenType } from "./tokenType";
import { LoxClass } from "./LoxClass";
import { LoxInstance } from "./LoxInstance";

export class Interpreter {
  readonly globals = new Environment();
  private environment = this.globals;
  private readonly locals = new Map<exprs.Expr, number>();

  constructor() {
    this.globals.define(
      "clock",
      new (class extends LoxCallable {
        arity = 0;
        stringify = () => "<native fn>";
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
      case exprs.Node.This:
        return this.interpretThis(expr);
      case exprs.Node.Super:
        return this.interpretSuper(expr);
      case exprs.Node.Assignment:
        return this.interpretAssignment(expr);
      case exprs.Node.Call:
        return this.interpretCall(expr);
      case exprs.Node.Get:
        return this.interpretGet(expr);
      case exprs.Node.Set:
        return this.interpretSet(expr);
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
      case stmts.Node.Class:
        return this.interpretClassDeclaration(statement);
      case stmts.Node.Return:
        return this.interpretReturn(statement);
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
    const func = new LoxFunction(stmt, this.environment, false);
    this.environment.define(stmt.name.lexeme, func);
  }

  private interpretClassDeclaration(stmt: stmts.ClassStatement): void {
    let superclass;
    if (stmt.superclass) {
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(
          stmt.superclass.name,
          "Superclass must be a class.",
        );
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (superclass) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const methods = new Map<string, LoxFunction>();
    for (const method of stmt.methods) {
      const fn = new LoxFunction(
        method,
        this.environment,
        method.name.lexeme === "init",
      );
      methods.set(method.name.lexeme, fn);
    }

    const klass = new LoxClass(stmt.name.lexeme, superclass, methods);

    if (superclass) {
      this.environment = this.environment.enclosing!;
    }

    this.environment.assign(stmt.name, klass);
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

  private interpretReturn(stmt: stmts.ReturnStatement): void {
    const returnValue = stmt.value ? this.evaluate(stmt.value) : null;
    throw new Return(returnValue);
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

  private interpretAssignment(expr: exprs.Assignment) {
    const value = this.evaluate(expr.value);

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }

    return value;
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
    return this.lookUpVariable(variable.name, variable);
  }

  private interpretThis(thisExpr: exprs.This) {
    return this.lookUpVariable(thisExpr.keyword, thisExpr);
  }

  private interpretSuper(superExpr: exprs.Super) {
    const distance = this.locals.get(superExpr);
    if (distance === undefined) {
      throw new Error("Expect invariant that super is found.");
    }
    const superclass = this.environment.getAt(distance, "super");
    if (!(superclass instanceof LoxClass)) {
      throw new Error("Expect invariant that superclass is a class.");
    }
    const object = this.environment.getAt(distance - 1, "this");
    if (!(object instanceof LoxInstance)) {
      throw new Error("Expect invariant that object is an instance.");
    }

    const method = superclass.findMethod(superExpr.method.lexeme);
    if (!method) {
      throw new RuntimeError(
        superExpr.method,
        `Undefined property '${superExpr.method.lexeme}'.`,
      );
    }
    return method.bind(object);
  }

  private lookUpVariable(name: Token, expr: exprs.Expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
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
        `Expected ${callee.arity} arguments but got ${args.length}.`,
      );
    }
    return callee.call(this, args);
  }

  private interpretGet(get: exprs.Get) {
    const object = this.evaluate(get.object);
    if (object instanceof LoxInstance) {
      return object.get(get.name);
    }

    throw new RuntimeError(get.name, "Only instances have properties.");
  }

  private interpretSet(set: exprs.Set) {
    const object = this.evaluate(set.object);

    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(set.name, "Only instances have fields.");
    }
    const value = this.evaluate(set.value);
    object.set(set.name, value);
    return value;
  }

  resolve(expr: exprs.Expr, depth: number) {
    this.locals.set(expr, depth);
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
  if (typeof value !== "object") {
    return `${value}`;
  }
  return value.stringify();
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
