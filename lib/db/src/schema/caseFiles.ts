import { sql } from "drizzle-orm";
import {
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const caseFiles = pgTable("case_files", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientName: text("client_name"),
  matterType: text("matter_type").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(8),
  summary: text("summary"),
  issues: jsonb("issues")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  keyFacts: jsonb("key_facts")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  nextSteps: jsonb("next_steps")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  nextDeadline: date("next_deadline"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const caseFileMessages = pgTable("case_file_messages", {
  id: serial("id").primaryKey(),
  caseFileId: integer("case_file_id")
    .notNull()
    .references(() => caseFiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCaseFileSchema = createInsertSchema(caseFiles);
export const insertCaseFileMessageSchema =
  createInsertSchema(caseFileMessages);

export type CaseFile = typeof caseFiles.$inferSelect;
export type CaseFileMessage = typeof caseFileMessages.$inferSelect;