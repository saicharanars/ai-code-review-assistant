import {
  timestamp,
  boolean,
  uuid,
  pgTable,
  varchar,
  index,
  foreignKey,

} from 'drizzle-orm/pg-core';
import { defineRelations } from 'drizzle-orm';


export const usersTable = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  verified: boolean(),
  verificationtoken: varchar({ length: 64 }),
});

export const forgotPasswordTable = pgTable(
  'forgotPassword',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    token: varchar({ length: 6 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    used: boolean().notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('forgotpassword_user_id_idx').on(table.userId),
    idIdx: index('forgotpassword_id_idx').on(table.id),
    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      name: 'forgotpassword_user_fk',
    }).onDelete('cascade'),
  })
);

export const tokensTable = pgTable(
  'tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    tokenHash: varchar({ length: 64 }).notNull(),
    userId: uuid('user_id').notNull(),
    used: boolean().notNull().default(false),
    usedAt: timestamp('used_at'),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('tokens_user_id_idx').on(table.userId),
    tokenHashIdx: index('tokens_token_hash_idx').on(table.tokenHash),
    expiresAtIdx: index('tokens_expires_at_idx').on(table.expiresAt),
    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [usersTable.id],
      name: 'tokens_user_fk',
    }).onDelete('cascade'),
  })
);


export const relations = defineRelations(
  { usersTable, tokensTable, forgotPasswordTable },
  (r) => ({
    usersTable: {
      tokens: r.many.tokensTable({
        from: r.usersTable.id,
        to: r.tokensTable.userId,
      }),
      forgotpasswords: r.many.forgotPasswordTable({
        from: r.usersTable.id,
        to: r.forgotPasswordTable.userId,
      }),
    },
    tokensTable: {
      user: r.one.usersTable({
        from: r.tokensTable.userId,
        to: r.usersTable.id,
      }),
    },
    forgotPasswordTable: {
      user: r.one.usersTable({
        from: r.forgotPasswordTable.userId,
        to: r.usersTable.id,
      }),
    },
  })
);