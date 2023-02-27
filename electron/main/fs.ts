import { FsEntry } from "@far-more/web-ui";
import { ipcMain } from "electron";
import fs from "fs";

export function initFsHook() {
  ipcMain.handle("fs", (_, operation: FsOperation) => {
    switch (operation.cmd) {
      case "watch":
        return 0;
      case "readDirectory":
        const entries = fs.readdirSync(
          decodeURI(new URL(operation.url).pathname)
        );
        return entries.map((e) => {
          try {
            let stat = fs.statSync(
              decodeURI(new URL(e, operation.url).pathname)
            );
            if (stat.isFile() && stat.isSymbolicLink()) {
              const link = fs.readlinkSync(
                decodeURI(new URL(e, operation.url).pathname)
              );
              stat = fs.statSync(link);
            }
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
        fs.mkdirSync(decodeURI(new URL(operation.url).pathname));
        break;
      case "readFile":
        return fs.readFileSync(decodeURI(new URL(operation.url).pathname));
      case "writeFile":
        fs.writeFileSync(
          decodeURI(new URL(operation.url).pathname),
          operation.content
        );
        break;
      case "delete":
        fs.rmSync(decodeURI(new URL(operation.url).pathname), {
          recursive: operation.options.recursive,
        });
        break;
      case "rename":
        fs.renameSync(
          decodeURI(new URL(operation.oldUrl).pathname),
          decodeURI(new URL(operation.newUrl).pathname)
        );
        break;
      case "copy":
        fs.cpSync(
          decodeURI(new URL(operation.source).pathname),
          decodeURI(new URL(operation.destination).pathname)
        );
    }
  });
}
