/**
 * Native HTML5 combobox: <input list="..."> + <datalist>. Browsers render
 * type-ahead filtering for free; no JS needed. The form posts the typed
 * slug, which the server resolves to a category id.
 */
type Cat = { slug: string; name: string };

export function CategoryTypeahead({
  categories,
  defaultValue,
  required,
}: {
  categories: Cat[];
  defaultValue?: string;
  required?: boolean;
}) {
  const listId = "category-typeahead";
  return (
    <label className="block">
      <span className="font-label uppercase tracking-[0.12em] text-on-surface-variant">
        Category
      </span>
      <input
        list={listId}
        name="categorySlug"
        required={required}
        defaultValue={defaultValue}
        autoComplete="off"
        placeholder="Start typing… cookies, pies, bars…"
        className="ghost-border mt-1 w-full rounded-md bg-surface-container-high px-4 py-3 font-body text-on-surface focus:bg-primary-fixed focus:outline-none"
      />
      <datalist id={listId}>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug} label={c.name} />
        ))}
      </datalist>
      <p className="mt-1 text-xs text-on-surface-variant">
        Pick from the list. Need a new one?{" "}
        <a href="/admin/categories/new" className="text-primary underline">
          Create a category
        </a>
        .
      </p>
    </label>
  );
}
