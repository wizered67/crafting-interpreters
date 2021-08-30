import { Expr, Node } from "./ast";

export function printAst(expr: Expr): string {
  switch (expr.kind) {
    case Node.Binary:
      return parenthesize(expr.operator.lexeme, expr.left, expr.right);
    case Node.Grouping:
      return parenthesize("group", expr.expression);
    case Node.Literal:
      return expr.value === null ? "nil" : `${expr.value}`;
    case Node.Unary:
      return parenthesize(expr.operator.lexeme, expr.right);
  }
}

function parenthesize(name: string, ...exprs: Expr[]): string {
  const exprsPrinted = exprs.map((expr) => printAst(expr)).join(" ");
  return `(${name}${exprs.length > 0 ? " " : ""}${exprsPrinted})`;
}
