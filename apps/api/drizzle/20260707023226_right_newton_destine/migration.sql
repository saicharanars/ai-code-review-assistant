CREATE TABLE "forgotPassword" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tokenHash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"family_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified" boolean,
	"verificationtoken" varchar(64)
);
--> statement-breakpoint
CREATE INDEX "forgotpassword_user_id_idx" ON "forgotPassword" ("user_id");--> statement-breakpoint
CREATE INDEX "forgotpassword_id_idx" ON "forgotPassword" ("id");--> statement-breakpoint
CREATE INDEX "tokens_user_id_idx" ON "tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "tokens_token_hash_idx" ON "tokens" ("tokenHash");--> statement-breakpoint
CREATE INDEX "tokens_expires_at_idx" ON "tokens" ("expires_at");--> statement-breakpoint
ALTER TABLE "forgotPassword" ADD CONSTRAINT "forgotpassword_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;