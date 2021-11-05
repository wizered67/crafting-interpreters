import { Lox } from ".";
import { exprs, stmts } from "./ast";
import { Interpreter } from "./interpreter";
import { Token } from "./token";

enum FunctionType {
  NONE = "NONE",
  FUNCTION = "FUNCTION",
  INITIALIZER = "INITIALIZER",
  METHOD = "METHOD",
}

enum ClassType {
  NONE = "NONE",
  CLASS = "CLASS",
  SUBCLASS = "SUBCLASS",
}

export class Resolver {
  private readonly interpreter: Interpreter;
  private readonly scopes: Map<string, boolean>[] = [];
  private currentFunction: FunctionType = FunctionType.NONE;
  private currentClass: ClassType = ClassType.NONE;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  resolveStatements(statements: stmts.Statement[]): void {
    for (const statement of statements) {
      this.resolve(statement);
    }
  }

  private resolve(node: exprs.Expr | stmts.Statement | undefined): void {
    if (!node) {
      return;
    }
    switch (node.kind) {
      case stmts.Node.Block:
        return this.resolveBlockStatement(node);
      case stmts.Node.Var:
        return this.resolveVarStatement(node);
      case stmts.Node.Function:
        return this.resolveFunctionStatement(node);
      case stmts.Node.Class:
        return this.resolveClassStatement(node);
      case stmts.Node.Expression:
        return this.resolve(node.expression);
      case stmts.Node.If:
        return this.resolveAll([node.condition, node.body, node.elseBody]);
      case stmts.Node.Print:
        return this.resolve(node.expression);
      case stmts.Node.Return:
        return this.resolveReturn(node);
      case stmts.Node.While:
        return this.resolveAll([node.condition, node.body]);
      case exprs.Node.Variable:
        return this.resolveVariableExpr(node);
      case exprs.Node.This:
        return this.resolveThis(node);
      case exprs.Node.Super:
        return this.resolveSuper(node);
      case exprs.Node.Assignment:
        return this.resolveAssignment(node);
      case exprs.Node.Binary:
        return this.resolveAll([node.left, node.right]);
      case exprs.Node.Call:
        return this.resolveAll([node.callee, ...node.args]);
      case exprs.Node.Get:
        return this.resolve(node.object);
      case exprs.Node.Set:
        return this.resolveAll([node.value, node.object]);
      case exprs.Node.Grouping:
        return this.resolve(node.expression);
      case exprs.Node.Literal:
        return;
      case exprs.Node.Unary:
        return this.resolve(node.right);
      default:
        assertUnreachable(node);
    }
  }

  private resolveAll(nodes: Array<exprs.Expr | stmts.Statement | undefined>) {
    for (const node of nodes) {
      if (node) {
        this.resolve(node);
      }
    }
  }

  private resolveBlockStatement(statement: stmts.BlockStatement) {
    this.beginScope();
    this.resolveStatements(statement.statements);
    this.endScope();
  }

  private resolveVarStatement(statement: stmts.VarStatement) {
    this.declare(statement.name);
    if (statement.initializer) {
      this.resolve(statement.initializer);
    }
    this.define(statement.name);
  }

  private resolveFunctionStatement(statement: stmts.FunctionStatement) {
    this.declare(statement.name);
    this.define(statement.name);
    this.resolveFunction(statement, FunctionType.FUNCTION);
  }

  private resolveClassStatement(statement: stmts.ClassStatement) {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.CLASS;

    this.declare(statement.name);
    this.define(statement.name);

    if (statement.superclass) {
      this.currentClass = ClassType.SUBCLASS;
      if (statement.name.lexeme === statement.superclass.name.lexeme) {
        Lox.error(
          statement.superclass.name,
          "A class can't inherit from itself.",
        );
      }
      this.resolve(statement.superclass);
    }

    if (statement.superclass) {
      this.beginScope();
      this.peekScope().set("super", true);
    }

    this.beginScope();
    this.peekScope().set("this", true);

    for (const method of statement.methods) {
      const declaration =
        method.name.lexeme === "init"
          ? FunctionType.INITIALIZER
          : FunctionType.METHOD;
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    if (statement.superclass) {
      this.endScope();
    }

    this.currentClass = enclosingClass;
  }

  private resolveVariableExpr(expr: exprs.Variable) {
    if (
      this.scopes.length > 0 &&
      this.peekScope().get(expr.name.lexeme) === false
    ) {
      Lox.error(expr.name, "Can't read local variable in its own initializer.");
    }

    this.resolveLocal(expr, expr.name);
  }

  private resolveThis(expr: exprs.This) {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'this' outside of a class.");
      return;
    }
    this.resolveLocal(expr, expr.keyword);
  }

  private resolveSuper(expr: exprs.Super) {
    if (this.currentClass === ClassType.NONE) {
      Lox.error(expr.keyword, "Can't use 'super' outside of a class.");
    } else if (this.currentClass !== ClassType.SUBCLASS) {
      Lox.error(
        expr.keyword,
        "Can't use 'super' in a class with no superclass.",
      );
    }
    this.resolveLocal(expr, expr.keyword);
  }

  private resolveAssignment(expr: exprs.Assignment) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  private resolveLocal(expr: exprs.Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  private resolveFunction(func: stmts.FunctionStatement, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolveStatements(func.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private resolveReturn(stmt: stmts.ReturnStatement) {
    if (this.currentFunction === FunctionType.NONE) {
      Lox.error(stmt.keyword, "Can't return from top-level code.");
    }
    if (stmt.value !== undefined) {
      if (this.currentFunction === FunctionType.INITIALIZER) {
        Lox.error(stmt.keyword, "Can't return a value from an initializer.");
      }
      this.resolve(stmt.value);
    }
  }

  private peekScope() {
    return this.scopes[this.scopes.length - 1];
  }

  private beginScope() {
    this.scopes.push(new Map());
  }

  private endScope() {
    this.scopes.pop();
  }

  private declare(name: Token) {
    if (this.scopes.length === 0) {
      return;
    }
    const scope = this.peekScope();
    if (scope.has(name.lexeme)) {
      Lox.error(name, "Already a variable with this name in this scope.");
    }

    scope.set(name.lexeme, false);
  }

  private define(name: Token) {
    if (this.scopes.length === 0) {
      return;
    }
    const scope = this.peekScope();
    scope.set(name.lexeme, true);
  }
}

function assertUnreachable(value: never): never {
  throw new Error("Shouldn't have reached this.");
}
