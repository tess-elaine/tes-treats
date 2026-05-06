"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  siteConfig,
  type DeliveryZone,
  type BakeryAddress,
} from "@/db/schema/site_config";
import { requireAdmin } from "@/lib/auth-helpers";

function s(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function parseZones(text: string): DeliveryZone[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): DeliveryZone | null => {
      const [label, zips, fee] = line.split("|").map((x) => x.trim());
      const feeCents = Number(fee);
      if (!label || !zips || !Number.isFinite(feeCents)) return null;
      return {
        label,
        postalCodes: zips
          .split(",")
          .map((z) => z.trim())
          .filter(Boolean),
        feeCents,
      };
    })
    .filter((z): z is DeliveryZone => z != null);
}

export async function saveConfigAction(formData: FormData) {
  await requireAdmin();

  const address: BakeryAddress = {
    line1: s(formData.get("line1")),
    line2: s(formData.get("line2")) || undefined,
    city: s(formData.get("city")),
    state: s(formData.get("state")) || "NY",
    postalCode: s(formData.get("postalCode")),
  };
  const zones = parseZones(s(formData.get("zones")));
  // Form takes dollars (e.g. "20000.00"); store as cents.
  const taxDollars = Number(s(formData.get("taxThresholdUsd")));
  const taxThreshold =
    Number.isFinite(taxDollars) && taxDollars > 0
      ? Math.round(taxDollars * 100)
      : 2_000_000;

  const existing = await db.query.siteConfig.findFirst();
  if (existing) {
    await db
      .update(siteConfig)
      .set({
        bakeryAddress: address,
        pickupEnabled: formData.get("pickupEnabled") === "on",
        pickupInstructions: s(formData.get("pickupInstructions")) || null,
        deliveryEnabled: formData.get("deliveryEnabled") === "on",
        deliveryZones: zones,
        taxEnabled: formData.get("taxEnabled") === "on",
        taxThresholdCents: taxThreshold,
        updatedAt: new Date(),
      })
      .where(eq(siteConfig.id, 1));
  } else {
    await db.insert(siteConfig).values({
      id: 1,
      bakeryAddress: address,
      pickupEnabled: formData.get("pickupEnabled") === "on",
      pickupInstructions: s(formData.get("pickupInstructions")) || null,
      deliveryEnabled: formData.get("deliveryEnabled") === "on",
      deliveryZones: zones,
      taxEnabled: formData.get("taxEnabled") === "on",
      taxThresholdCents: taxThreshold,
    });
  }

  redirect("/admin/config?saved=1");
}
