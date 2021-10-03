import { LoxValue } from "./ast/value";
import { TokenType } from "./tokenType";

export class Token<T extends TokenType = TokenType> {
  readonly type: T;
  readonly lexeme: string;
  readonly literal: LoxValue;
  readonly line: number;

  constructor(type: T, lexeme: string, literal: LoxValue, line: number) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  toString() {
    return `${this.type} ${this.lexeme} ${this.literal}`;
  }
}
