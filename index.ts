import * as fs from "fs";
import * as readline from "readline";

const args = process.argv.slice(2);
if (args.length > 1) {
    console.log("Usage: tslox [script]");
    process.exit(64);
} else if (args.length === 1) {
    runFile(args[0]);
} else {
    runPrompt();
}

function runFile(path: string) {
    const fileBuffer = fs.readFileSync(path);
    run(fileBuffer.toString());
}

function runPrompt() {
    const reader = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    function runNextLine() {
        reader.question('> ', line => {
            run(line);
            runNextLine();
        });
    }
    runNextLine();
}

function run(source: string) {
    // const scanner = new Scanner();
    // const tokens = scanner.scanTokens();
    // for (const aToken of tokens) {
    //     console.log(aToken);
    // }
}