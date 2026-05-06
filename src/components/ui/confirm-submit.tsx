"use client";

import * as React from "react";

type Props = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick" | "children"
> & {
  message?: string;
  children: React.ReactNode;
};

/**
 * Submit button that runs `confirm()` first. Cancel → no submit.
 * Use anywhere a click triggers a permanent destructive action that can't
 * be undone via "Save changes" or similar.
 *
 * Accepts all the usual button props (className, disabled, title,
 * formAction for bound server actions, etc.) so it drops in wherever a
 * vanilla submit button was.
 */
export function ConfirmSubmit({
  message = "Are you sure? This cannot be undone.",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
