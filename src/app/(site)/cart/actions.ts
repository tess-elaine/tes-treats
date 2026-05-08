"use server";

import { revalidatePath } from "next/cache";
import {
  addLine,
  removeLine,
  updateQuantity,
  lineKeyFromId,
  getCart,
  type RawLine,
} from "@/lib/cart";

export async function getCartAction() {
  return getCart();
}

export async function addToCartAction(formData: FormData) {
  const kind = String(formData.get("kind") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);

  let line: RawLine | null = null;
  if (kind === "variant") {
    const id = String(formData.get("productVariantId") ?? "");
    if (id) line = { kind: "variant", productVariantId: id, quantity };
  } else if (kind === "drop_box") {
    const id = String(formData.get("dropId") ?? "");
    if (id) line = { kind: "drop_box", dropId: id, quantity };
  } else if (kind === "drop_dozen") {
    const id = String(formData.get("dropItemId") ?? "");
    if (id) line = { kind: "drop_dozen", dropItemId: id, quantity };
  }
  if (!line) return;

  await addLine(line);
  revalidatePath("/cart");
  revalidatePath("/", "layout"); // refresh cart count in header
}

export async function updateQuantityAction(formData: FormData) {
  const lineId = String(formData.get("lineId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const key = lineKeyFromId(lineId);
  if (!key) return;
  await updateQuantity(key, quantity);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeLineAction(formData: FormData) {
  const lineId = String(formData.get("lineId") ?? "");
  const key = lineKeyFromId(lineId);
  if (!key) return;
  await removeLine(key);
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
