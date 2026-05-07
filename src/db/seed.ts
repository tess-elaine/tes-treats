/**
 * Seed script — safe to re-run; uses upserts where the natural key allows.
 * Run with: npm run db:seed
 *
 * What it seeds:
 *   1. site_config singleton (Tess's current address; her delivery zones).
 *   2. A few sample products with variants (delete in admin if Tess doesn't sell them).
 *   3. A sample "Mother's Day Box" cookie box with 3 cookies.
 *   4. A sample upcoming drop tied to that box so the homepage has something live.
 *
 * Memory anchor: Tess is at 746 Lafayette Ave, Buffalo NY (moving in a few
 * months). Address must come from site_config, never hardcoded elsewhere.
 */
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  siteConfig,
  cookieBoxes,
  cookieBoxItems,
  products,
  productVariants,
  productCategories,
  drops,
  dropItems,
  users,
} from "./schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding TES Treats…");

  // -----------------------------------------------------------------------
  // 1. site_config (singleton row)
  // -----------------------------------------------------------------------
  await db
    .insert(siteConfig)
    .values({
      id: 1,
      bakeryAddress: {
        line1: "746 Lafayette Ave",
        city: "Buffalo",
        state: "NY",
        postalCode: "14222",
      },
      pickupEnabled: true,
      pickupInstructions:
        "Pickup available evenings & weekends. Tess will text the morning of with a window.",
      deliveryEnabled: true,
      deliveryZones: [
        { label: "Buffalo (city)", postalCodes: ["14201", "14202", "14203", "14209", "14210", "14211", "14213", "14214", "14216", "14222"], feeCents: 500 },
        { label: "Near suburbs", postalCodes: ["14217", "14223", "14226", "14207", "14215", "14225"], feeCents: 800 },
      ],
      taxEnabled: false,
      taxThresholdCents: 2_000_000,
    })
    .onConflictDoUpdate({
      target: siteConfig.id,
      set: {
        bakeryAddress: sql`excluded.bakery_address`,
        deliveryZones: sql`excluded.delivery_zones`,
        updatedAt: new Date(),
      },
    });
  console.log("  ✓ site_config");

  // -----------------------------------------------------------------------
  // 2. Sample products
  // -----------------------------------------------------------------------
  type Seed = {
    slug: string;
    name: string;
    shortDescription: string;
    categorySlug: "cookie" | "pie" | "bar";
    isFeatured: boolean;
    sortOrder: number;
    chips: string[];
    variants: { label: string; priceCents: number; isDefault?: boolean; sortOrder?: number }[];
  };
  const seedProducts: Seed[] = [
    {
      slug: "brown-butter-chocolate-chip",
      name: "Brown Butter Chocolate Chip",
      shortDescription: "Slow-toasted butter, two chocolates, flaky salt.",
      categorySlug: "cookie",
      isFeatured: true,
      sortOrder: 10,
      chips: ["Bestseller", "Slow-Mixed"],
      variants: [
        { label: "Half Dozen", priceCents: 1800, sortOrder: 0 },
        { label: "Dozen",      priceCents: 3200, sortOrder: 1, isDefault: true },
      ],
    },
    {
      slug: "heritage-berry-pie",
      name: "Heritage Berry Pie",
      shortDescription: "Three berries, lattice top, all-butter crust.",
      categorySlug: "pie",
      isFeatured: true,
      sortOrder: 20,
      chips: ["Seasonal"],
      variants: [
        { label: "9-inch", priceCents: 3200, isDefault: true },
      ],
    },
    {
      slug: "gooey-caramel-bites",
      name: "Gooey Caramel Bites",
      shortDescription: "Salted caramel center, shortbread shell.",
      categorySlug: "cookie",
      isFeatured: true,
      sortOrder: 30,
      chips: ["Crowd Favorite"],
      variants: [
        { label: "Dozen", priceCents: 2200, isDefault: true },
      ],
    },
    {
      slug: "lavender-shortbread",
      name: "Lavender Shortbread",
      shortDescription: "Buttery, floral, the right amount of fancy.",
      categorySlug: "cookie",
      isFeatured: false,
      sortOrder: 40,
      chips: ["Floral"],
      variants: [
        { label: "Dozen", priceCents: 1800, isDefault: true },
      ],
    },
    {
      slug: "espresso-sandwich",
      name: "Espresso Sandwich Cookie",
      shortDescription: "Mocha buttercream between two espresso wafers.",
      categorySlug: "cookie",
      isFeatured: false,
      sortOrder: 50,
      chips: ["Contains Caffeine"],
      variants: [
        { label: "Half Dozen", priceCents: 1800 },
        { label: "Dozen",      priceCents: 3400, isDefault: true },
      ],
    },
  ];

  const baseCategories: { slug: string; name: string; sortOrder: number }[] = [
    { slug: "cookie", name: "Cookies", sortOrder: 10 },
    { slug: "pie",    name: "Pies",    sortOrder: 20 },
    { slug: "bar",    name: "Bars",    sortOrder: 30 },
    { slug: "loaf",   name: "Loaves",  sortOrder: 40 },
    { slug: "other",  name: "Other",   sortOrder: 99 },
  ];
  for (const c of baseCategories) {
    const exists = await db.query.productCategories.findFirst({
      where: (t, { eq }) => eq(t.slug, c.slug),
    });
    if (!exists) {
      await db.insert(productCategories).values(c);
    }
  }

  const cats = await db.query.productCategories.findMany();
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  for (const p of seedProducts) {
    const existing = await db.query.products.findFirst({
      where: (t, { eq }) => eq(t.slug, p.slug),
    });
    if (existing) continue;
    const categoryId = catBySlug.get(p.categorySlug) ?? catBySlug.get("other")!;
    const [inserted] = await db
      .insert(products)
      .values({
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        categoryId,
        isFeatured: p.isFeatured,
        sortOrder: p.sortOrder,
        ingredientChips: p.chips,
      })
      .returning({ id: products.id });
    for (const v of p.variants) {
      await db.insert(productVariants).values({
        productId: inserted.id,
        label: v.label,
        priceCents: v.priceCents,
        isDefault: v.isDefault ?? false,
        sortOrder: v.sortOrder ?? 0,
      });
    }
  }
  console.log(`  ✓ products (${seedProducts.length} sample products)`);

  // -----------------------------------------------------------------------
  // 3. Sample cookie box — "Mother's Day Box"
  // -----------------------------------------------------------------------
  let box = await db.query.cookieBoxes.findFirst({
    where: (t, { eq }) => eq(t.name, "Mother's Day Box"),
  });
  if (!box) {
    const [created] = await db
      .insert(cookieBoxes)
      .values({
        name: "Mother's Day Box",
        tagline: "Five cookies that taste like spring.",
        description:
          "Lavender shortbread, lemon-poppy, brown-butter chocolate chip, raspberry thumbprints, and pistachio rosewater — assembled into a hand-tied box.",
        notes: "Annual spring drop. Usually runs the week before Mother's Day.",
      })
      .returning({ id: cookieBoxes.id });
    box = { id: created.id, name: "Mother's Day Box", isHidden: false, tagline: "Five cookies that taste like spring.", description: null, heroImageUrl: null, notes: null, createdAt: new Date() };
    console.log("  ✓ Mother's Day Box created");
  }

  // Pin sample cookies to the box (idempotent — check existing items first).
  const existingBoxItems = await db.query.cookieBoxItems.findMany({
    where: (t, { eq }) => eq(t.cookieBoxId, box!.id),
  });
  if (existingBoxItems.length === 0) {
    const dropProductSlugs = [
      "lavender-shortbread",
      "brown-butter-chocolate-chip",
      "gooey-caramel-bites",
    ];
    const dropProducts = await db.query.products.findMany({
      where: (t, { inArray }) => inArray(t.slug, dropProductSlugs),
    });
    for (let i = 0; i < dropProducts.length; i++) {
      await db.insert(cookieBoxItems).values({
        cookieBoxId: box!.id,
        productId: dropProducts[i].id,
        sortOrder: i,
      });
    }
    console.log("  ✓ Mother's Day Box cookies added");
  }

  // -----------------------------------------------------------------------
  // 4. Sample drop — Mother's Day 2026
  // -----------------------------------------------------------------------
  const existingDrop = await db.query.drops.findFirst({
    where: (t, { eq }) => eq(t.slug, "mothers-day-2026"),
  });
  if (!existingDrop) {
    const [drop] = await db
      .insert(drops)
      .values({
        cookieBoxId: box!.id,
        slug: "mothers-day-2026",
        name: "Mother's Day 2026",
        opensAt: new Date("2026-04-28T08:00:00Z"),
        closesAt: new Date("2026-05-08T16:00:00Z"),
        fulfillmentStart: "2026-05-09",
        fulfillmentEnd: "2026-05-10",
        assortedBoxPriceCents: 4800,
        assortedBoxInventory: 40,
        isPublished: true,
      })
      .returning({ id: drops.id });

    // Create drop_items from box items.
    const boxItems = await db.query.cookieBoxItems.findMany({
      where: (t, { eq }) => eq(t.cookieBoxId, box!.id),
      orderBy: (t, { asc }) => [asc(t.sortOrder)],
    });
    for (const item of boxItems) {
      await db.insert(dropItems).values({
        dropId: drop.id,
        cookieBoxItemId: item.id,
        sortOrder: item.sortOrder,
        dozenPriceCents: 2400,
        dozenInventory: 12,
      });
    }
    console.log("  ✓ Mother's Day 2026 sample drop");
  }

  // -----------------------------------------------------------------------
  // 5. Dev users (admin@admin.com / customer@customer.com, password "password")
  // -----------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const devUsers: { email: string; name: string; role: "admin" | "customer" }[] = [
      { email: "admin@admin.com",       name: "Admin Tester",    role: "admin" },
      { email: "customer@customer.com", name: "Customer Tester", role: "customer" },
    ];
    const passwordHash = await bcrypt.hash("password", 12);
    for (const u of devUsers) {
      const existing = await db.query.users.findFirst({
        where: (t, { eq }) => eq(t.email, u.email),
      });
      if (existing) {
        await db
          .update(users)
          .set({ passwordHash, role: u.role, name: u.name, emailVerified: new Date() })
          .where(sql`${users.email} = ${u.email}`);
      } else {
        await db.insert(users).values({
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash,
          emailVerified: new Date(),
        });
      }
    }
    console.log("  ✓ dev users (admin@admin.com / customer@customer.com — password: password)");
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
