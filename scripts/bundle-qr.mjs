import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve("./teknoloji-sozlugu/node_modules/qrcode");
const dijkstraDir = path.resolve("./teknoloji-sozlugu/node_modules/dijkstrajs");

const modules = {};

function addModule(id, filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  modules[id] = content;
}

function walk(dir, prefix) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, prefix + item + "/");
    } else if (item.endsWith(".js")) {
      addModule(prefix + item, full);
    }
  }
}
walk(path.join(rootDir, "lib"), "./lib/");
addModule("dijkstrajs", path.join(dijkstraDir, "dijkstra.js"));

let output = "(function(window){\n";
output += "  var modules = {};\n";
output += "  var cache = {};\n";
output += "  function customRequire(id, from) {\n";
output += "    var resolved = id;\n";
output += "    if (id === 'dijkstrajs') resolved = 'dijkstrajs';\n";
output += "    else if (id.startsWith('./') || id.startsWith('../')) {\n";
output += "      var base = from ? from.substring(0, from.lastIndexOf('/')) : '.';\n";
output += "      var parts = (base + '/' + id).split('/');\n";
output += "      var stack = [];\n";
output += "      for (var i = 0; i < parts.length; i++) {\n";
output += "        if (parts[i] === '.' || parts[i] === '') continue;\n";
output += "        if (parts[i] === '..') stack.pop();\n";
output += "        else stack.push(parts[i]);\n";
output += "      }\n";
output += "      resolved = './' + stack.join('/');\n";
output += "      if (!resolved.endsWith('.js')) resolved += '.js';\n";
output += "    }\n";
output += "    if (cache[resolved]) return cache[resolved].exports;\n";
output += "    if (!modules[resolved]) throw new Error('Module not found: ' + resolved + ' from: ' + from);\n";
output += "    var mod = { exports: {} };\n";
output += "    cache[resolved] = mod;\n";
output += "    modules[resolved](function(childId){ return customRequire(childId, resolved); }, mod, mod.exports);\n";
output += "    return mod.exports;\n";
output += "  }\n\n";

for (const [id, content] of Object.entries(modules)) {
  output += "  modules[" + JSON.stringify(id) + "] = function(require, module, exports) {\n" + content + "\n  };\n\n";
}

output += "  var api = customRequire('./lib/browser.js');\n";
output += "  window.QRCode = api;\n";
output += "})(typeof window !== 'undefined' ? window : globalThis);\n";

fs.writeFileSync("./teknoloji-sozlugu/dist/vendor/qrcode.js", output, "utf8");
if (fs.existsSync("./sites-stage-v3/dist/vendor")) {
  fs.writeFileSync("./sites-stage-v3/dist/vendor/qrcode.js", output, "utf8");
}
console.log("Bundle updated! Bytes:", output.length);
