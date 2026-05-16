"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSaveBar } from "@/components/ui/admin-save-bar";
import { saveSiteConfigAction } from "./actions";

type Zone = { label: string; postalCodes?: string[]; feeCents: number };
type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
};

type Config = {
  bakeryAddress?: Address | null;
  pickupEnabled?: boolean | null;
  pickupInstructions?: string | null;
  deliveryEnabled?: boolean | null;
  deliveryZones?: Zone[] | null;
  taxEnabled?: boolean | null;
  taxThresholdCents?: number | null;
};

export function SiteConfigClient({ cfg }: { cfg: Config | null | undefined }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const zonesText = (cfg?.deliveryZones ?? [])
    .map((z) => `${z.label}|${(z.postalCodes ?? []).join(",")}|${z.feeCents}`)
    .join("\n");

  const changeCount = isDirty ? 1 : 0;

  function handleSave() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startTransition(async () => {
      try {
        await saveSiteConfigAction(fd);
        setIsDirty(false);
        setSaveStatus("saved");
        router.refresh();
      } catch {
        setSaveStatus("error");
      }
    });
  }

  function handleDiscard() {
    setIsDirty(false);
    setSaveStatus("idle");
    setResetKey((k) => k + 1);
  }

  return (
    <>
      <NibbleCard bite="none" className="p-6 md:p-10">
        <form
          key={resetKey}
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          onChange={() => { setIsDirty(true); setSaveStatus("idle"); }}
          className="space-y-8"
        >
          <section>
            <h2 className="font-headline text-xl font-bold text-primary">Bakery address</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field name="line1" label="Street" defaultValue={cfg?.bakeryAddress?.line1 ?? ""} required />
              <Field name="line2" label="Suite/Apt" defaultValue={cfg?.bakeryAddress?.line2 ?? ""} />
              <Field name="city" label="City" defaultValue={cfg?.bakeryAddress?.city ?? "Buffalo"} required />
              <Field name="state" label="State" defaultValue={cfg?.bakeryAddress?.state ?? "NY"} required />
              <Field name="postalCode" label="ZIP" defaultValue={cfg?.bakeryAddress?.postalCode ?? ""} required />
            </div>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-primary">Pickup</h2>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                name="pickupEnabled"
                defaultChecked={cfg?.pickupEnabled ?? true}
                className="h-4 w-4 accent-primary"
              />
              <span>Allow pickup at the address above</span>
            </label>
            <label className="mt-4 block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Pickup instructions
              </span>
              <textarea
                name="pickupInstructions"
                rows={3}
                defaultValue={cfg?.pickupInstructions ?? ""}
                placeholder="e.g. Pickup evenings & weekends. Tess texts day-of with a window."
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
              />
            </label>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-primary">Local delivery</h2>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                name="deliveryEnabled"
                defaultChecked={cfg?.deliveryEnabled ?? true}
                className="h-4 w-4 accent-primary"
              />
              <span>Offer local delivery</span>
            </label>
            <label className="mt-4 block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Delivery zones
              </span>
              <p className="text-xs text-on-surface-variant">
                One zone per line:{" "}
                <code>Label | comma-separated zips | fee_in_cents</code>
              </p>
              <textarea
                name="zones"
                rows={6}
                defaultValue={zonesText}
                placeholder="Buffalo (city)|14201,14202,14209,14222|500"
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-mono text-sm focus:bg-primary-fixed focus:outline-none"
              />
            </label>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-primary">Tax</h2>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                name="taxEnabled"
                defaultChecked={cfg?.taxEnabled ?? false}
                className="h-4 w-4 accent-primary"
              />
              <span>
                Collect sales tax (NY: most cookies sold whole are exempt — only enable when your
                accountant says so)
              </span>
            </label>
            <Field
              name="taxThresholdUsd"
              type="number"
              label="Threshold warning ($) — banner appears when YTD revenue approaches this"
              defaultValue={((cfg?.taxThresholdCents ?? 2_000_000) / 100).toFixed(2)}
            />
          </section>
        </form>
      </NibbleCard>

      {(changeCount > 0 || saveStatus !== "idle") && <div className="h-20" />}
      <AdminSaveBar
        changeCount={changeCount}
        saveStatus={saveStatus}
        isPending={isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const isMoney = name.endsWith("Usd");
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={isMoney ? "0.01" : undefined}
        min={isMoney ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
