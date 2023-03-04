import { FileChangeEvent } from "@far-more/web-ui";

export type FsOperationWatch = {
  cmd: "watch";
  url: string;
  options: { recursive: boolean; excludes: string[] };
};

export type FsOperationWatchStop = { cmd: "watch.stop"; watchId: number };

export type FsOperationReadDirectory = { cmd: "readDirectory"; url: string };

export type FsOperationCreateDirectory = {
  cmd: "createDirectory";
  url: string;
};

export type FsOperationReadFile = { cmd: "readFile"; url: string };

export type FsOperationWriteFile = {
  cmd: "writeFile";
  url: string;
  content: Uint8Array;
  options: { create: boolean; overwrite: boolean };
};

export type FsOperationDelete = {
  cmd: "delete";
  url: string;
  options: { recursive: boolean };
};

export type FsOperationRename = {
  cmd: "rename";
  oldUrl: string;
  newUrl: string;
  options: { overwrite: boolean };
};

export type FsOperationCopy = {
  cmd: "copy";
  source: string;
  destination: string;
  options: { overwrite: boolean };
};

export type FsOperation =
  | FsOperationWatch
  | FsOperationWatchStop
  | FsOperationReadDirectory
  | FsOperationCreateDirectory
  | FsOperationReadFile
  | FsOperationWriteFile
  | FsOperationDelete
  | FsOperationRename
  | FsOperationCopy;

export type LocalFsApi = {
  startOperation(id: number, operation: FsOperation): void;
  abortOperation(id: number): void;
  onOperationComplete(
    callback: (args: { id: number; err: any; data: any }) => void
  ): void;
  onFsEvent(
    callback: (args: { id: number; events: FileChangeEvent[] }) => void
  ): void;
};
