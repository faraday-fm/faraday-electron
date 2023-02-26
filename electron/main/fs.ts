import { FsEntry } from "@far-more/web-ui";
import { ipcMain } from "electron";
import fs from "fs";

export function initFsHook() {
  ipcMain.handle("fs", (_, operation: FsOperation) => {
    switch (operation.cmd) {
      case "watch":
        return 0;
      case "readDirectory":
        const entries = fs.readdirSync(new URL(operation.url).pathname);
        return entries.map((e) => {
          try {
            const stat = fs.statSync(new URL(e, operation.url).pathname);
            return {
              name: e,
              isDir: stat.isDirectory(),
              isFile: stat.isFile(),
              isSymlink: stat.isSymbolicLink(),
              accessed: stat.atimeMs,
              created: stat.ctimeMs,
              modified: stat.mtimeMs,
              size: stat.size,
            } as FsEntry;
          } catch (err) {
            return {
              name: e,
            } as FsEntry;
          }
        });
      case "createDirectory":
        fs.mkdirSync(new URL(operation.url).pathname);
        break;
      case "readFile":
        return fs.readFileSync(new URL(operation.url).pathname);
      case "writeFile":
        fs.writeFileSync(new URL(operation.url).pathname, operation.content);
        break;
      case "delete":
        fs.rmSync(new URL(operation.url).pathname, {
          recursive: operation.options.recursive,
        });
        break;
      case "rename":
        fs.renameSync(
          new URL(operation.oldUrl).pathname,
          new URL(operation.newUrl).pathname
        );
        break;
      case "copy":
        fs.cpSync(
          new URL(operation.source).pathname,
          new URL(operation.destination).pathname
        );
    }
  });
}
