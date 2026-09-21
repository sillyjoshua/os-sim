export type FsNodeType = "file" | "folder";

export type FsNode = {
  id: number;
  parentId: number | null;
  type: FsNodeType;
  name: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};
