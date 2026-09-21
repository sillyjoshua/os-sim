import {
  AnyPgColumn,
  pgEnum,
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const fsNodeType = pgEnum("fs_node_type", ["file", "folder"]);

export const fsNodes = pgTable("fs_nodes", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references((): AnyPgColumn => fsNodes.id, {
    onDelete: "cascade",
  }),
  type: fsNodeType("type").notNull(),
  name: text("name").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const fsNodesRelations = relations(fsNodes, ({ one, many }) => ({
  parent: one(fsNodes, {
    fields: [fsNodes.parentId],
    references: [fsNodes.id],
  }),
  children: many(fsNodes),
}));

export type FsNode = typeof fsNodes.$inferSelect;
export type NewFsNode = typeof fsNodes.$inferInsert;

