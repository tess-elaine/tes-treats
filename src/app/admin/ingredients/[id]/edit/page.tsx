import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { IngredientEditClient } from "./IngredientEditClient";

export const metadata = { title: "Edit ingredient" };

export default async function EditIngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const ing = await db.query.ingredients.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!ing) notFound();

  return (
    <section>
      <Link
        href="/admin/ingredients"
        className="font-label uppercase tracking-[0.2em] text-on-secondary-container hover:text-primary"
      >
        ← Ingredients
      </Link>
      <h1 className="mt-1 font-headline text-3xl font-extrabold text-primary">
        Edit: {ing.name}
      </h1>

      <IngredientEditClient ing={ing} />
    </section>
  );
}
