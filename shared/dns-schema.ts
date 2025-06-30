import { pgTable, text, varchar, timestamp, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// DNS Records Management
export const dnsRecords = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  cloudflareRecordId: varchar("cloudflare_record_id").unique(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  content: text("content").notNull(),
  ttl: integer("ttl").default(1),
  proxied: boolean("proxied").default(false),
  comment: text("comment"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDnsRecordSchema = createInsertSchema(dnsRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DnsRecord = typeof dnsRecords.$inferSelect;
export type InsertDnsRecord = z.infer<typeof insertDnsRecordSchema>;