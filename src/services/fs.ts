import { FileSystemProvider } from "@far-more/web-ui";
import { faker } from "@faker-js/faker";
import layout from "./far-more/layout.json5?raw";
import settings from "./far-more/settings.json5?raw";

const encoder = new TextEncoder();

function file(fs: FileSystemProvider, name: string, content: string) {
  fs.writeFile(new URL("far-more:" + name), encoder.encode(content), {
    create: true,
    overwrite: false,
  });
}

export function buildFarMoreFs(fs: FileSystemProvider) {
  file(fs, "/layout.json", layout);
  file(fs, "/settings.json", settings);
}
