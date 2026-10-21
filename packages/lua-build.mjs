import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const packageName = process.argv[2];
const entries = {
	"result-lua": {
		implementation: "result-lua/src/tenets_result.lua",
		declarations: "result-lua/roblox-ts/index.d.ts",
	},
	"invariant-lua": {
		implementation: "invariant-lua/src/tenets_invariant.lua",
		declarations: "invariant-lua/roblox-ts/index.d.ts",
	},
};

const entry = entries[packageName];
if (!entry) {
	throw new Error(`Unknown Lua package: ${packageName ?? "<missing>"}`);
}

const outputDirectory = join(packageDirectory, packageName, "out");
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
	copyFile(join(packageDirectory, entry.implementation), join(outputDirectory, "init.lua")),
	copyFile(join(packageDirectory, entry.declarations), join(outputDirectory, "index.d.ts")),
]);
