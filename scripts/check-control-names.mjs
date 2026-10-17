#!/usr/bin/env node
// Static check: every interactive control in src/**/*.tsx has an accessible name.
//
// A control passes when it has any of:
//   - aria-label or aria-labelledby
//   - an id that some <Label htmlFor> / <label htmlFor> in the same file points at
//     (the id and htmlFor expressions must be written the same way)
//   - an enclosing <label> / <Label> element
//   - for buttons: visible text in its children (text, a string, or a variable)
//   - for text inputs: a placeholder (axe accepts it; a real label is still better)
//   - a literal `hidden` class (display: none, so it is not in the accessibility tree;
//     used for file pickers that a visible button opens)
//
// Escape hatch: put `// a11y-name-ok: <reason>` (or {/* a11y-name-ok: <reason> */})
// on the line directly above the tag.
//
// Usage: node scripts/check-control-names.mjs   (exits 1 when anything is unnamed)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
// The vendored shadcn primitives forward the caller's props with {...props};
// the caller is the one who has to name them.
const UI_DIR = join(SRC, "components", "ui");

// Controls that are never named by their children.
const NEEDS_LABEL = new Set([
  "SelectTrigger",
  "Switch",
  "Slider",
  "Checkbox",
  "RadioGroupItem",
  "Input",
  "Textarea",
  "input",
  "textarea",
  "select",
]);
// Controls that can be named by their visible children.
const BUTTON_LIKE = new Set([
  "Button",
  "button",
  "Toggle",
  "ToggleGroupItem",
  "DropdownMenuTrigger",
  "PopoverTrigger",
  "DialogTrigger",
  "AlertDialogTrigger",
  "SheetTrigger",
  "CollapsibleTrigger",
]);
// Triggers with asChild render their child, which is checked on its own.
const ASCHILD_TRIGGERS = new Set([
  "DropdownMenuTrigger",
  "PopoverTrigger",
  "DialogTrigger",
  "AlertDialogTrigger",
  "SheetTrigger",
  "CollapsibleTrigger",
  "TooltipTrigger",
]);
const PLACEHOLDER_OK = new Set(["Input", "Textarea", "input", "textarea"]);
const INPUT_TYPES_WITHOUT_NAME = new Set(["hidden", "submit", "reset", "button", "image"]);

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

function tagName(node) {
  return node.tagName.getText();
}

function attrsOf(opening) {
  const out = new Map();
  let spread = false;
  for (const prop of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(prop)) {
      spread = true;
      continue;
    }
    const name = prop.name.getText();
    const init = prop.initializer;
    let text = "";
    if (init) {
      text = ts.isStringLiteral(init) ? JSON.stringify(init.text) : init.getText().trim();
      if (text.startsWith("{") && text.endsWith("}")) text = text.slice(1, -1).trim();
    } else {
      text = "true";
    }
    out.set(name, text);
  }
  return { attrs: out, spread };
}

function hasLetters(s) {
  return /[A-Za-z0-9]/.test(s);
}

// Does this expression (a JSX child expression) produce visible text?
function exprHasText(expr) {
  if (!expr) return false;
  if (ts.isParenthesizedExpression(expr)) return exprHasText(expr.expression);
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))
    return hasLetters(expr.text);
  if (ts.isTemplateExpression(expr)) return true;
  if (ts.isNumericLiteral(expr)) return true;
  if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) return true;
  if (ts.isElementAccessExpression(expr)) return true;
  if (ts.isCallExpression(expr)) return true;
  if (ts.isConditionalExpression(expr))
    return exprHasText(expr.whenTrue) || exprHasText(expr.whenFalse);
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return exprHasText(expr.right);
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken)
      return exprHasText(expr.left) || exprHasText(expr.right);
    if (op === ts.SyntaxKind.PlusToken) return true;
    return false;
  }
  if (ts.isJsxElement(expr) || ts.isJsxFragment(expr)) return childrenHaveText(expr.children);
  if (ts.isJsxSelfClosingElement(expr)) return false;
  return false;
}

function childrenHaveText(children) {
  for (const child of children) {
    if (ts.isJsxText(child)) {
      if (hasLetters(child.getText())) return true;
    } else if (ts.isJsxExpression(child)) {
      if (exprHasText(child.expression)) return true;
    } else if (ts.isJsxElement(child)) {
      const { attrs } = attrsOf(child.openingElement);
      if (attrs.get("aria-hidden") === "true" || attrs.get("aria-hidden") === '"true"') continue;
      if (childrenHaveText(child.children)) return true;
    } else if (ts.isJsxFragment(child)) {
      if (childrenHaveText(child.children)) return true;
    }
  }
  return false;
}

function insideLabel(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxElement(p)) {
      const name = tagName(p.openingElement);
      if (name === "label" || name === "Label" || name === "FormControl") return true;
    }
  }
  return false;
}

function hasEscape(sf, text, node) {
  const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
  const lines = text.split("\n");
  for (let i = line - 1; i >= 0 && i >= line - 2; i--) {
    if (/a11y-name-ok:\s*\S/.test(lines[i])) return true;
    if (lines[i].trim() !== "") break;
  }
  return false;
}

const hits = [];

for (const file of sourceFiles(SRC)) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const inUi = file.startsWith(UI_DIR);

  // Every htmlFor expression in the file, as written.
  const htmlFors = new Set();
  const collect = (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText() === "htmlFor" && node.initializer) {
      let t = ts.isStringLiteral(node.initializer)
        ? JSON.stringify(node.initializer.text)
        : node.initializer.getText().trim();
      if (t.startsWith("{") && t.endsWith("}")) t = t.slice(1, -1).trim();
      htmlFors.add(t);
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);

  const visit = (node) => {
    let opening = null;
    let children = null;
    if (ts.isJsxElement(node)) {
      opening = node.openingElement;
      children = node.children;
    } else if (ts.isJsxSelfClosingElement(node)) {
      opening = node;
      children = [];
    }
    if (opening) {
      const name = tagName(opening);
      const isNeeds = NEEDS_LABEL.has(name);
      const isButton = BUTTON_LIKE.has(name);
      if (isNeeds || isButton) {
        const { attrs, spread } = attrsOf(opening);
        const skip =
          (inUi && spread) ||
          (ASCHILD_TRIGGERS.has(name) && attrs.has("asChild")) ||
          (name === "input" &&
            INPUT_TYPES_WITHOUT_NAME.has(JSON.parse(attrs.get("type") ?? '""'))) ||
          attrs.has("aria-label") ||
          attrs.has("aria-labelledby") ||
          (attrs.has("id") && htmlFors.has(attrs.get("id"))) ||
          (isButton && childrenHaveText(children)) ||
          (PLACEHOLDER_OK.has(name) && attrs.has("placeholder")) ||
          /^"(?:.*\s)?hidden(?:\s.*)?"$/.test(attrs.get("className") ?? "") ||
          insideLabel(node) ||
          hasEscape(sf, text, node);
        if (!skip) {
          const { line } = sf.getLineAndCharacterOfPosition(opening.getStart(sf));
          const why = attrs.has("id")
            ? `id=${attrs.get("id")} has no matching htmlFor`
            : isButton
              ? "no text, aria-label or aria-labelledby"
              : "no id+htmlFor, aria-label or aria-labelledby";
          hits.push(`${relative(ROOT, file)}:${line + 1}  <${name}>  ${why}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

if (hits.length) {
  console.error(hits.join("\n"));
  console.error(`\n${hits.length} control(s) without an accessible name.`);
  process.exit(1);
}
console.log("check-control-names: every control has an accessible name.");
