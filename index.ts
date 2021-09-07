import * as fs from "fs";
import * as readline from "readline";
import { printAst } from "./astPrinter";
import { Parser } from "./parser";
import { Scanner } from "./scanner";
import { Token } from "./token";
import { TokenType } from "./tokenType";

export class Lox {
  static hadError = false;

  static main(args: string[]) {
    if (args.length > 1) {
      console.log("Usage: tslox [script]");
      process.exit(64);
    } else if (args.length === 1) {
      Lox.runFile(args[0]);
    } else {
      Lox.runPrompt();
    }
  }

  private static runFile(path: string) {
    const fileBuffer = fs.readFileSync(path);
    Lox.run(fileBuffer.toString());
    if (Lox.hadError) {
      process.exit(65);
    }
  }

  private static runPrompt() {
    const reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    function runNextLine() {
      reader.question("> ", (line) => {
        Lox.run(line);
        Lox.hadError = false;
        runNextLine();
      });
    }
    runNextLine();
  }

  private static run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const expr = parser.parse();
    if (this.hadError || !expr) {
      return;
    }
    console.log(printAst(expr));
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error${where}: ${message}`);
    Lox.hadError = true;
  }

  static error(line: number, message: string): void;
  static error(token: Token, message: string): void;
  static error(area: number | Token, message: string) {
    if (typeof area === "number") {
      Lox.report(area, "", message);
      return;
    }
    const token = area;
    if (token.type === TokenType.EOF) {
      Lox.report(token.line, " at the end", message);
    } else {
      Lox.report(token.line, ` at '${token.lexeme}'`, message);
    }
  }
}

const args = process.argv.slice(2);
Lox.main(args);
