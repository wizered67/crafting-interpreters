import { Lox } from ".";
import { Expr, Node, Statement } from "./ast";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Parser {
  private tokens: readonly Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Statement[] {
    const statements = [];
    while (!this.isAtEnd()) {
      const statement = this.declaration();
      if (statement) {
        statements.push(statement);
      }
    }

    return statements;
  }

  private declaration(): Statement | null {
    try {
      if (this.match(TokenType.VAR)) {
        return this.varDeclaration();
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

  private varDeclaration(): Statement {
    const identifier = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name.",
    );
    let expression = null;
    if (this.match(TokenType.EQUAL)) {
      expression = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: Node.Var, name: identifier, initializer: expression };
  }

  private statement(): Statement {
    if (this.match(TokenType.PRINT)) {
      return this.printStatement();
    }
    return this.expressionStatement();
  }

  private printStatement(): Statement {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: Node.Print, expression: value };
  }

  private expressionStatement(): Statement {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return { kind: Node.Expression, expression: value };
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.equality();

    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr.kind === Node.Variable) {
        const name = expr.name;
        return { kind: Node.Assignment, name, value };
      }
      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private equality(): Expr {
    return this.parseLeftAssociativeBinary(
      () => this.comparison(),
      [TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL],
    );
  }

  private comparison(): Expr {
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

  private term(): Expr {
    return this.parseLeftAssociativeBinary(
      () => this.factor(),
      [TokenType.PLUS, TokenType.MINUS],
    );
  }

  private factor(): Expr {
    return this.parseLeftAssociativeBinary(
      () => this.unary(),
      [TokenType.STAR, TokenType.SLASH],
    );
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return { kind: Node.Unary, operator, right };
    }
    return this.primary();
  }

  private primary(): Expr {
    if (this.match(TokenType.TRUE)) {
      return { kind: Node.Literal, value: true };
    }
    if (this.match(TokenType.FALSE)) {
      return { kind: Node.Literal, value: false };
    }
    if (this.match(TokenType.NIL)) {
      return { kind: Node.Literal, value: null };
    }
    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      const token = this.previous();
      return { kind: Node.Literal, value: token.literal };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return { kind: Node.Variable, name: this.previous() };
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return { kind: Node.Grouping, expression: expr };
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private parseLeftAssociativeBinary(
    operandFn: () => Expr,
    validOperators: TokenType[],
  ): Expr {
    let expr = operandFn();

    while (this.match(...validOperators)) {
      const operator = this.previous();
      const right = operandFn();
      expr = { kind: Node.Binary, left: expr, operator, right };
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
