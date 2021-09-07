import { Lox } from ".";
import { Expr, Node } from "./ast";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Parser {
  private tokens: readonly Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr | null {
    try {
      const expr = this.expression();
      if (!this.isAtEnd()) {
        Lox.error(this.peek(), "Unexpected token");
      }
      return expr;
    } catch (err: unknown) {
      if (err instanceof ParseError) {
        return null;
      }
      throw err;
    }
  }

  private expression(): Expr {
    return this.equality();
  }

  private equality(): Expr {
    return this.parseLeftAssociativeBinary(() => this.comparison(), [
      TokenType.EQUAL_EQUAL,
      TokenType.BANG_EQUAL,
    ]);
  }

  private comparison(): Expr {
    return this.parseLeftAssociativeBinary(() => this.term(), [
      TokenType.GREATER,
      TokenType.GREATER_EQUAL,
      TokenType.LESS,
      TokenType.LESS_EQUAL,
    ]);
  }

  private term(): Expr {
    return this.parseLeftAssociativeBinary(() => this.factor(), [
      TokenType.PLUS,
      TokenType.MINUS,
    ]);
  }

  private factor(): Expr {
    return this.parseLeftAssociativeBinary(() => this.unary(), [
      TokenType.STAR,
      TokenType.SLASH,
    ]);
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