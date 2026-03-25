const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["background.js"],
  bundle: true,
  outfile: "dist/background.bundle.js",
  format: "iife",
  target: "chrome110",
  minify: false,
  sourcemap: false,
}).then(() => {
  console.log("Build complete: dist/background.bundle.js");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
