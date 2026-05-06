-- Switch order_item FKs from RESTRICT to SET NULL so deleting a product /
-- variant / drop doesn't fail. Order line items already carry snapshot
-- fields (name_snapshot, variant_label_snapshot, unit_price_cents) so
-- historical orders remain readable after the live row goes away.

ALTER TABLE "order_item" DROP CONSTRAINT "order_item_product_variant_id_product_variant_id_fk";--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_variant_id_product_variant_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" DROP CONSTRAINT "order_item_drop_id_drop_id_fk";--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_drop_id_drop_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drop"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" DROP CONSTRAINT "order_item_drop_item_id_drop_item_id_fk";--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_drop_item_id_drop_item_id_fk" FOREIGN KEY ("drop_item_id") REFERENCES "public"."drop_item"("id") ON DELETE set null ON UPDATE no action;
