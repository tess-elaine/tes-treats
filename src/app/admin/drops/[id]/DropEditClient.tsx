"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSaveBar } from "@/components/ui/admin-save-bar";
import { saveDropDetailsAction } from "../actions";

type Box = { id: string; name: string };

type Drop = {
  id: string;
  name: string;
  slug: string;
  cookieBoxId: string | null;
  assortedBoxPriceCents: number | null;
  opensAt: Date | string;
  closesAt: Date | string;
  fulfillmentStart: string;
  fulfillmentEnd: string;
  assortedBoxInventory: number | null;
  isPublished: boolean;
};

function toLocalIso(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function DropEditClient({
  drop,
  allBoxes,
}: {
  drop: Drop;
  allBoxes: Box[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const changeCount = isDirty ? 1 : 0;

  function handleSave() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("id", drop.id);
    startTransition(async () => {
      try {
        await saveDropDetailsAction(fd);
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
        <h2 className="font-headline text-xl font-bold text-primary">Drop details</h2>
        <form
          key={resetKey}
          ref={formRef}
          onSubmit={(e) => e.preventDefault()}
          onChange={() => { setIsDirty(true); setSaveStatus("idle"); }}
          className="mt-4 space-y-6"
        >
          <input type="hidden" name="id" value={drop.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Drop name" defaultValue={drop.name} required />
            <Field name="slug" label="URL slug" defaultValue={drop.slug} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Cookie box
              </span>
              <select
                name="cookieBoxId"
                defaultValue={drop.cookieBoxId ?? ""}
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
              >
                <option value="">— None —</option>
                {allBoxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {drop.cookieBoxId ? (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Changing the box will reset cookie pricing for this drop.
                </p>
              ) : null}
            </label>
            <Field
              name="assortedBoxPriceUsd"
              type="number"
              label="Assorted box price ($)"
              defaultValue={
                drop.assortedBoxPriceCents != null
                  ? (drop.assortedBoxPriceCents / 100).toFixed(2)
                  : ""
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="opensAt"
              type="datetime-local"
              label="Opens at"
              defaultValue={toLocalIso(drop.opensAt)}
              required
            />
            <Field
              name="closesAt"
              type="datetime-local"
              label="Closes at"
              defaultValue={toLocalIso(drop.closesAt)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="fulfillmentStart"
              type="date"
              label="Fulfillment starts"
              defaultValue={String(drop.fulfillmentStart)}
              required
            />
            <Field
              name="fulfillmentEnd"
              type="date"
              label="Fulfillment ends"
              defaultValue={String(drop.fulfillmentEnd)}
              required
            />
          </div>

          <Field
            name="assortedBoxInventory"
            type="number"
            label="Box inventory (blank = unlimited)"
            defaultValue={String(drop.assortedBoxInventory ?? "")}
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={drop.isPublished}
              className="h-4 w-4 accent-primary"
            />
            <span>Published</span>
          </label>
        </form>
      </NibbleCard>

      {changeCount > 0 && <div className="h-20" />}
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
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        step={isMoney ? "0.01" : undefined}
        min={isMoney ? 0 : undefined}
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
