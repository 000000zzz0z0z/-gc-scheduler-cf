import fs from "node:fs";
let html = fs.readFileSync("build/index.html", "utf8");
const css = fs.readFileSync("build/style.css", "utf8");
const sound = fs.readFileSync("build/sound.js", "utf8");
const app = fs.readFileSync("build/app.js", "utf8");
html = html.replace("/*__CSS__*/", () => css).replace("/*__SOUND__*/", () => sound).replace("/*__APP__*/", () => app);
const escaped = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
fs.writeFileSync("src/page.mjs", "// build/ から自動生成。直接編集しないでください。\nexport const PAGE = `" + escaped + "`;\n");
console.log("page.mjs generated");
