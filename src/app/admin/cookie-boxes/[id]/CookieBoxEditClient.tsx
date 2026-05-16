"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NibbleCard } from "@/components/ui/nibble-card";
import { BiteButton } from "@/components/ui/bite-button";
import { AdminSaveBar } from "@/components/ui/admin-save-bar";
import { formatDate } from "@/lib/format";
import {
  saveBoxDetailsAction,
  reorderBoxItemsAction,
  addBoxItemReturnAction,
  removeBoxItemAction,
} from "../actions";

type Product = { id: string; name: string; shortDescription: string | null };
type BoxItem = { id: string; sortOrder: number; product: Product };
type Drop = { id: string; name: string; opensAt: Date | string; isPublished: boolean };

type Box = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  notes: string | null;
  isHidden: boolean;
};

export function CookieBoxEditClient({
  box,
  initialItems,
  initialAvailableProducts,
  drops,
}: {
  box: Box;
  initialItems: BoxItem[];
  initialAvailableProducts: Product[];
  drops: Drop[];
}) {
  const router = useRouter();

  // Box details form
  const [isPendingDetails, startDetailsTransition] = useTransition();
  const detailsFormRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Items list
  const [items, setItems] = useState<BoxItem[]>(initialItems);
  const [availableProducts, setAvailableProducts] = useState<Product[]>(initialAvailableProducts);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [isPendingItem, startItemTransition] = useTransition();

  // Drag-and-drop
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const changeCount = isDirty ? 1 : 0;

  // ----- Box details save/discard -----

  function handleSave() {
    if (!detailsFormRef.current) return;
    const fd = new FormData(detailsFormRef.current);
    fd.set("id", box.id);
    startDetailsTransition(async () => {
      try {
        await saveBoxDetailsAction(fd);
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

  // ----- Drag-and-drop -----

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) {
      setDragOverIdx(null);
      return;
    }
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    setItems(next);
    setDragOverIdx(null);
    dragIdx.current = null;
    startItemTransition(async () => {
      await reorderBoxItemsAction(
        box.id,
        next.map((item) => item.id)
      );
    });
  }

  function handleDragEnd() {
    setDragOverIdx(null);
    dragIdx.current = null;
  }

  // ----- Add / Remove items -----

  function handleAdd() {
    if (!selectedProductId) return;
    const product = availableProducts.find((p) => p.id === selectedProductId);
    if (!product) return;
    startItemTransition(async () => {
      const created = await addBoxItemReturnAction(box.id, selectedProductId);
      if (created) {
        setItems((prev) => [
          ...prev,
          { id: created.id, sortOrder: created.sortOrder, product },
        ]);
        setAvailableProducts((prev) => prev.filter((p) => p.id !== selectedProductId));
        setSelectedProductId("");
      }
    });
  }

  function handleRemove(itemId: string, productId: string) {
    if (!confirm("Remove this cookie from the box?")) return;
    const product = items.find((i) => i.id === itemId)?.product;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (product) setAvailableProducts((prev) => [...prev, product]);
    startItemTransition(async () => {
      await removeBoxItemAction(itemId, box.id);
    });
  }

  return (
    <>
      {/* Box details */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <h2 className="font-headline text-xl font-bold text-primary">Box details</h2>
        <form
          key={resetKey}
          ref={detailsFormRef}
          onSubmit={(e) => e.preventDefault()}
          onChange={() => { setIsDirty(true); setSaveStatus("idle"); }}
          className="mt-4 space-y-5"
        >
          <input type="hidden" name="id" value={box.id} />
          <Field name="name" label="Box name" defaultValue={box.name} required />
          <Field name="tagline" label="Short tagline" defaultValue={box.tagline ?? ""} />
          <label className="block">
            <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              defaultValue={box.description ?? ""}
              className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
            />
          </label>
          <Field name="notes" label="Notes (admin-only)" defaultValue={box.notes ?? ""} />
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isHidden"
              defaultChecked={box.isHidden}
              className="h-4 w-4 accent-primary"
            />
            <span>Hidden</span>
          </label>
        </form>
      </NibbleCard>

      {/* Cookies in this box */}
      <NibbleCard bite="none" className="p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-headline text-xl font-bold text-primary">
            Cookies in this box
          </h2>
          <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            {items.length} {items.length === 1 ? "cookie" : "cookies"}
          </span>
        </div>

        <div className="mt-4 space-y-1">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={[
                "grid items-center gap-3 rounded-md p-3 transition-colors",
                "grid-cols-[1.25rem_1fr_auto]",
                dragOverIdx === idx ? "bg-primary-fixed/40" : "hover:bg-surface-container-low",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="select-none cursor-grab text-on-surface-variant/30 text-lg leading-none">
                ⠿
              </span>
              <div>
                <p className="font-medium text-on-surface">{item.product.name}</p>
                {item.product.shortDescription ? (
                  <p className="text-xs text-on-surface-variant">
                    {item.product.shortDescription}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isPendingItem}
                onClick={() => handleRemove(item.id, item.product.id)}
                title="Remove from box"
                className="text-on-surface-variant/40 transition-colors hover:text-on-error-container disabled:opacity-40"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        {/* Add a cookie */}
        {availableProducts.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-md bg-surface-container-lowest p-4">
            <label className="block flex-1">
              <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
                Add a cookie
              </span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body"
              >
                <option value="" disabled>
                  — Pick a cookie —
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={isPendingItem || !selectedProductId}
              onClick={handleAdd}
              className="font-label text-xs uppercase tracking-[0.12em] text-primary hover:underline disabled:opacity-40"
            >
              + Add
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-on-surface-variant">
            No cookies in the catalog yet.{" "}
            <Link href="/admin/products/new" className="text-primary underline">
              Add a product
            </Link>{" "}
            first.
          </p>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">
            All available cookies are in this box.
          </p>
        )}
      </NibbleCard>

      {/* Drops using this box */}
      {drops.length > 0 ? (
        <NibbleCard bite="none" className="p-6 md:p-10">
          <h2 className="font-headline text-xl font-bold text-primary">
            Drops using this box
          </h2>
          <ul className="mt-4 space-y-2">
            {drops.map((d) => (
              <li key={d.id} className="flex items-baseline gap-3">
                <Link
                  href={`/admin/drops/${d.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {d.name}
                </Link>
                <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">
                  {formatDate(d.opensAt)} · {d.isPublished ? "Published" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <BiteButton href="/admin/drops/new" size="md" variant="secondary">
              + New drop with this box
            </BiteButton>
          </div>
        </NibbleCard>
      ) : null}

      {(changeCount > 0 || saveStatus !== "idle") && <div className="h-20" />}
      <AdminSaveBar
        changeCount={changeCount}
        saveStatus={saveStatus}
        isPending={isPendingDetails}
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
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
