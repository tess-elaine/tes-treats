"use client";

import { useState } from "react";
import { formatCents } from "@/lib/format";

type DeliveryZone = { label: string; feeCents: number; postalCodes: string[] };

const PICKUP_LOCATIONS = [
  { value: "746 Lafayette Ave, Buffalo", label: "746 Lafayette Ave", detail: "Buffalo, NY" },
  { value: "ConEquip employee pickup", label: "Employee pickup", detail: "ConEquip" },
  { value: "AMS employee pickup", label: "Employee pickup", detail: "AMS" },
];

export function FulfillmentSection({
  pickupInstructions,
  deliveryZones,
}: {
  pickupInstructions?: string | null;
  deliveryZones?: DeliveryZone[] | null;
}) {
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");

  return (
    <>
      {/* Pickup / Delivery toggle */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["pickup", "delivery"] as const).map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer flex-col gap-1 rounded-md bg-surface-container-high p-4 transition-colors has-[:checked]:bg-primary-fixed"
          >
            <input
              type="radio"
              name="fulfillment"
              value={opt}
              checked={mode === opt}
              onChange={() => setMode(opt)}
              className="hidden"
            />
            <span className="font-headline font-bold text-on-surface">
              {opt === "pickup" ? "Pickup" : "Local delivery"}
            </span>
            <span className="text-sm text-on-surface-variant">
              {opt === "pickup" ? "Choose a pickup location below" : "Tess hand-delivers in Buffalo"}
            </span>
          </label>
        ))}
      </div>

      {pickupInstructions && mode === "pickup" && (
        <p className="mt-4 text-sm text-on-surface-variant">
          <span className="font-medium">Pickup:</span> {pickupInstructions}
        </p>
      )}

      {/* Pickup locations */}
      {mode === "pickup" && (
        <div className="mt-4 grid gap-2">
          <p className="font-label text-sm uppercase tracking-[0.12em] text-on-surface-variant">
            Where will you pick up?
          </p>
          {PICKUP_LOCATIONS.map((loc) => (
            <label
              key={loc.value}
              className="flex cursor-pointer items-center gap-3 rounded-md bg-surface-container-high p-4 transition-colors has-[:checked]:bg-primary-fixed"
            >
              <input
                type="radio"
                name="pickupLocation"
                value={loc.value}
                defaultChecked={loc.value === PICKUP_LOCATIONS[0].value}
                className="accent-primary"
              />
              <span>
                <span className="block font-medium text-on-surface">{loc.label}</span>
                <span className="block text-sm text-on-surface-variant">{loc.detail}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Delivery address */}
      {mode === "delivery" && (
        <div className="mt-4 grid gap-3">
          <Field name="line1" label="Street address" />
          <Field name="line2" label="Apt / suite (optional)" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field name="city" label="City" defaultValue="Buffalo" />
            <Field name="state" label="State" defaultValue="NY" />
            <Field name="postalCode" label="ZIP" />
          </div>
          <Field name="addressNotes" label="Delivery notes (gate code, etc.)" />
          {deliveryZones?.length ? (
            <p className="text-xs text-on-surface-variant">
              Currently delivering to:{" "}
              {deliveryZones.map((z) => `${z.label} (${formatCents(z.feeCents)})`).join(", ")}.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={label}
        className="ghost-border w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
