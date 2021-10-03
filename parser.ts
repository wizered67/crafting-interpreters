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
    return this.primary();
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
