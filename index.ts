import * as fs from "fs";
import * as readline from "readline";
import { Scanner } from "./scanner";

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
    for (const aToken of tokens) {
      console.log(aToken.toString());
    }
  }

  private static report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error${where}: ${message}`);
    Lox.hadError = true;
  }

  static error(line: number, message: string) {
    Lox.report(line, "", message);
  }
}

const args = process.argv.slice(2);
Lox.main(args);
