"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NibbleCard } from "@/components/ui/nibble-card";
import { AdminSaveBar } from "@/components/ui/admin-save-bar";
import { saveCategoryAction } from "../actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function CategoryEditClient({ cat }: { cat: Category }) {
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
    fd.set("id", cat.id);
    startTransition(async () => {
      try {
        await saveCategoryAction(fd);
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
          className="space-y-5"
        >
          <input type="hidden" name="id" value={cat.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={cat.name} required />
            <Field name="slug" label="Slug" defaultValue={cat.slug} />
          </div>
          <Field name="description" label="Description" defaultValue={cat.description ?? ""} />
          <Field
            name="sortOrder"
            type="number"
            label="Sort order"
            defaultValue={String(cat.sortOrder)}
          />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={cat.isActive}
              className="h-4 w-4 accent-primary"
            />
            <span>Active</span>
          </label>
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
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
