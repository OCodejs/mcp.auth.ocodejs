import { copyFile, mkdir, writeFile } from "node:fs/promises";

const outputDirectory = "_site";
await mkdir(outputDirectory, { recursive: true });
await copyFile("index.html", `${outputDirectory}/index.html`);
await writeFile(`${outputDirectory}/.nojekyll`, "");

console.log("Prepared GitHub Pages artifact with index.html only.");
