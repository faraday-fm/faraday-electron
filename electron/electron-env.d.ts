type FsOperationWatch = {
  cmd: "watch";
  url: string;
  options: { recursive: boolean; excludes: string[] };
};

type FsOperationWatchStop = { cmd: "watch.stop"; watchId: number };

type FsOperationReadDirectory = { cmd: "readDirectory"; url: string };

type FsOperationCreateDirectory = { cmd: "createDirectory"; url: string };

type FsOperationReadFile = { cmd: "readFile"; url: string };

type FsOperationWriteFile = {
  cmd: "writeFile";
  url: string;
  content: Uint8Array;
  options: { create: boolean; overwrite: boolean };
};

type FsOperationDelete = {
  cmd: "delete";
  url: string;
  options: { recursive: boolean };
};

type FsOperationRename = {
  cmd: "rename";
  oldUrl: string;
  newUrl: string;
  options: { overwrite: boolean };
};

type FsOperationCopy = {
  cmd: "copy";
  source: string;
  destination: string;
  options: { overwrite: boolean };
};

type FsOperation =
  | FsOperationWatch
  | FsOperationWatchStop
  | FsOperationReadDirectory
  | FsOperationCreateDirectory
  | FsOperationReadFile
  | FsOperationWriteFile
  | FsOperationDelete
  | FsOperationRename
  | FsOperationCopy;
