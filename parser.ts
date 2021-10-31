import { Lox } from ".";
import { exprs, stmts } from "./ast";
import { BinaryOperators } from "./ast/expressions";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Parser {
  private tokens: readonly Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): stmts.Statement[] {
    const statements = [];
    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  private declaration(): stmts.Statement | null {
    try {
      if (this.match(TokenType.FUN)) {
        return this.functionDeclaration("function");
      }
      if (this.match(TokenType.VAR)) {
        return this.varDeclaration();
      }
      if (this.match(TokenType.CLASS)) {
        return this.classDeclaration();
      }
      return this.statement();
    } catch (err: unknown) {
      if (err instanceof ParseError) {
        this.synchronize();
        return null;
      }
      throw err;
    }
  }

  private functionDeclaration(kind: string): stmts.FunctionStatement {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);

    const params: Token[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (params.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }

        params.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name"),
        );
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);

    const body = this.block();
    return { kind: stmts.Node.Function, name, params, body };
  }

  private varDeclaration(): stmts.Statement {
    const identifier = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name.",
    );
    let expression = null;
    if (this.match(TokenType.EQUAL)) {
      expression = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: stmts.Node.Var, name: identifier, initializer: expression };
  }

  private classDeclaration(): stmts.Statement {
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body.");

    const methods: stmts.FunctionStatement[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      methods.push(this.functionDeclaration("method"));
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' fter class body.");

    return { kind: stmts.Node.Class, name, methods };
  }

  private statement(): stmts.Statement {
    if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      return { kind: stmts.Node.Block, statements: this.block() };
    }
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.forStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }
    return this.expressionStatement();
  }

  private block(): stmts.Statement[] {
    const statements: stmts.Statement[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const declaration = this.declaration();
      if (declaration) {
        statements.push(declaration);
      }
    }
    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
  }

  private printStatement(): stmts.Statement {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: stmts.Node.Print, expression: value };
  }

  private expressionStatement(): stmts.Statement {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: stmts.Node.Expression, expression: value };
  }

  private ifStatement(): stmts.Statement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after if.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");
    const body = this.statement();
    let elseBody;
    if (this.match(TokenType.ELSE)) {
      elseBody = this.statement();
    }
    return { kind: stmts.Node.If, condition, body, elseBody };
  }

  private whileStatement(): stmts.Statement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after while.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after while condition.");
    const body = this.statement();
    return { kind: stmts.Node.While, condition, body };
  }

  private forStatement(): stmts.Statement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after for.");
    let initializer;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = undefined;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition = undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after loop condition");

    let increment = undefined;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after increment");

    const body = this.statement();

    let blockStatements: stmts.Statement[] = [];
    if (initializer) {
      blockStatements.push(initializer);
    }
    const trueLiteral: exprs.Expr = { kind: exprs.Node.Literal, value: true };
    const bodyBlockStatements = [body];
    if (increment) {
      bodyBlockStatements.push({
        kind: stmts.Node.Expression,
        expression: increment,
      });
    }
    blockStatements.push({
      kind: stmts.Node.While,
      condition: condition || trueLiteral,
      body: { kind: stmts.Node.Block, statements: bodyBlockStatements },
    });
    return { kind: stmts.Node.Block, statements: blockStatements };
  }

  private returnStatement(): stmts.Statement {
    const keyword = this.previous();
    let value;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return { kind: stmts.Node.Return, keyword, value };
  }

  private expression(): exprs.Expr {
    return this.assignment();
  }

  private assignment(): exprs.Expr {
    const expr = this.logicOr();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr.kind === exprs.Node.Variable) {
        const name = expr.name;
        return { kind: exprs.Node.Assignment, name, value };
      } else if (expr.kind === exprs.Node.Get) {
        return {
          kind: exprs.Node.Set,
          object: expr.object,
          name: expr.name,
          value,
        };
      }
      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private logicOr(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.logicAnd(),
      [TokenType.OR],
    );
  }

  private logicAnd(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.equality(),
      [TokenType.AND],
    );
  }

  private equality(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.comparison(),
      [TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL],
    );
  }

  private comparison(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.term(),
      [
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      ],
    );
  }

  private term(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.factor(),
      [TokenType.PLUS, TokenType.MINUS],
    );
  }

  private factor(): exprs.Expr {
    return this.parseLeftAssociativeBinary(
      () => this.unary(),
      [TokenType.STAR, TokenType.SLASH],
    );
  }

  private unary(): exprs.Expr {
    const unaryOperators = [TokenType.BANG, TokenType.MINUS] as const;
    if (this.match(...unaryOperators)) {
      const operator = this.previous() as Token<typeof unaryOperators[number]>;
      const right = this.unary();
      return { kind: exprs.Node.Unary, operator, right };
    }
    return this.call();
  }

  private call(): exprs.Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.'.",
        );
        expr = { kind: exprs.Node.Get, object: expr, name };
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: exprs.Expr): exprs.Expr {
    const args: exprs.Expr[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const paren = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after arguments.",
    );
    return { kind: exprs.Node.Call, callee, args, paren };
  }

  private primary(): exprs.Expr {
    if (this.match(TokenType.TRUE)) {
      return { kind: exprs.Node.Literal, value: true };
    }
    if (this.match(TokenType.FALSE)) {
      return { kind: exprs.Node.Literal, value: false };
    }
    if (this.match(TokenType.NIL)) {
      return { kind: exprs.Node.Literal, value: null };
    }
    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      const token = this.previous();
      return { kind: exprs.Node.Literal, value: token.literal };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return { kind: exprs.Node.Variable, name: this.previous() };
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return { kind: exprs.Node.Grouping, expression: expr };
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private parseLeftAssociativeBinary<T extends BinaryOperators>(
    operandFn: () => exprs.Expr,
    validOperators: T[],
  ): exprs.Expr {
    let expr = operandFn();

    while (this.match(...validOperators)) {
      const operator = this.previous() as Token<T>;
      const right = operandFn();
      expr = { kind: exprs.Node.Binary, left: expr, operator, right };
    }

    return expr;
  }

  private consume(type: TokenType, errorMessage: string) {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(this.peek(), errorMessage);
  }

  private error(token: Token, message: string) {
    Lox.error(token, message);
    return new ParseError();
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) {
        return;
      }

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }

      this.advance();
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private advance() {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private previous() {
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type === type;
  }

  private peek() {
    return this.tokens[this.current];
  }

  private isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }
}

class ParseError extends Error {
  constructor() {
    super("Parse error.");
  }
}
