"use client";

import { useState } from "react";

function format(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneInput({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ? format(defaultValue) : "");

  return (
    <label className="block">
      <span className="sr-only">Phone (optional)</span>
      <input
        name="phone"
        type="tel"
        value={value}
        onChange={(e) => setValue(format(e.target.value))}
        placeholder="Phone (optional)"
        className="ghost-border h-[50px] w-full rounded-md bg-surface-container-high px-4 font-body text-on-surface placeholder:text-on-surface-variant focus:bg-primary-fixed focus:outline-none"
      />
    </label>
  );
}
