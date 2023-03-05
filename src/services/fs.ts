import { FileSystemProvider, InMemoryFsProvider } from "@far-more/web-ui";
import layout from "./far-more/layout.json5?raw";
import settings from "./far-more/settings.json5?raw";

const encoder = new TextEncoder();

function file(fs: FileSystemProvider, name: string, content: string) {
  fs.writeFile(name, encoder.encode(content), {
    create: true,
    overwrite: false,
  });
}

export function buildFarMoreFs() {
  const fs = new InMemoryFsProvider();
  file(fs, "layout.json", layout);
  file(fs, "settings.json", settings);
  return fs;
}
