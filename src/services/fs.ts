import { FileSystemProvider, InMemoryFsProvider } from "@frdy/web-ui";

const encoder = new TextEncoder();

export function buildFaradayFs() {
  const fs = new InMemoryFsProvider();
  return fs;
}
