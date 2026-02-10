CREATE TABLE "content_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_group" text NOT NULL,
	"status" text DEFAULT 'staged' NOT NULL,
	"row_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"staged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_at" timestamp with time zone,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patterns_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"difficulty" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"severity" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_lessons_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"order_index" integer NOT NULL,
	"group" text,
	"difficulty" text NOT NULL,
	"estimated_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_steps_staging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"title" text NOT NULL,
	"instruction" text NOT NULL,
	"concept_code" text,
	"concept_code_language" text DEFAULT 'typescript',
	"solution_code" text,
	"playground_url" text,
	"hints" text[],
	"feedback_on_complete" text,
	"pattern_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tour_lessons" ADD COLUMN "group" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_content_writes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table "%" is locked. Write to "%_staging" instead.', TG_TABLE_NAME, TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER lock_patterns BEFORE INSERT OR UPDATE OR DELETE ON "patterns" FOR EACH ROW EXECUTE FUNCTION reject_content_writes();
--> statement-breakpoint
CREATE TRIGGER lock_rules BEFORE INSERT OR UPDATE OR DELETE ON "rules" FOR EACH ROW EXECUTE FUNCTION reject_content_writes();
--> statement-breakpoint
CREATE TRIGGER lock_tour_lessons BEFORE INSERT OR UPDATE OR DELETE ON "tour_lessons" FOR EACH ROW EXECUTE FUNCTION reject_content_writes();
--> statement-breakpoint
CREATE TRIGGER lock_tour_steps BEFORE INSERT OR UPDATE OR DELETE ON "tour_steps" FOR EACH ROW EXECUTE FUNCTION reject_content_writes();