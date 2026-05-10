"use client";

import { useState, useRef, useTransition } from "react";
import { BiteButton } from "@/components/ui/bite-button";
import {
  addRecipeStepAction,
  updateRecipeStepAction,
  deleteRecipeStepAction,
  reorderRecipeStepsAction,
} from "../../actions";

type Step = { id: string; content: string; sortOrder: number };

export function RecipeStepsClient({
  recipeId,
  productId,
  initialSteps,
}: {
  recipeId: string;
  productId: string;
  initialSteps: Step[];
}) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function startEdit(step: Step) {
    setEditingId(step.id);
    setEditContent(step.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  function handleAdd() {
    const content = newContent.trim();
    if (!content) return;
    const sortOrder = steps.length * 10;
    setNewContent("");
    startTransition(async () => {
      const row = await addRecipeStepAction(recipeId, productId, content, sortOrder);
      if (row) setSteps((l) => [...l, { id: row.id, content: row.content, sortOrder: row.sortOrder }]);
    });
  }

  return (
    <div className="space-y-3">
      {steps.length > 0 && (
        <ol className="space-y-1">
            {steps.map((step, idx) => (
              <li
                key={step.id}
                draggable={editingId !== step.id}
                onDragStart={() => { dragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIdx.current;
                  if (from === null || from === idx) { setDragOverIdx(null); return; }
                  const next = [...steps];
                  const [removed] = next.splice(from, 1);
                  next.splice(idx, 0, removed);
                  setSteps(next);
                  dragIdx.current = null;
                  setDragOverIdx(null);
                  startTransition(async () => {
                    await reorderRecipeStepsAction(recipeId, productId, next.map((s) => s.id));
                  });
                }}
                onDragEnd={() => { setDragOverIdx(null); dragIdx.current = null; }}
                className={[
                  "grid grid-cols-[1rem_1.75rem_1fr_1rem] items-baseline gap-x-3 rounded-md px-2 py-1.5 transition-colors",
                  dragOverIdx === idx
                    ? "bg-primary-fixed/40"
                    : editingId === step.id
                    ? ""
                    : "hover:bg-surface-container-high/50",
                ].filter(Boolean).join(" ")}
              >
                {/* Drag handle */}
                <span
                  className={[
                    "self-center select-none text-sm text-on-surface-variant/30",
                    editingId !== step.id ? "cursor-grab" : "cursor-default opacity-0",
                  ].join(" ")}
                >
                  ⠿
                </span>

                {/* Step number */}
                <span className="text-right font-label text-sm font-bold text-primary tabular-nums">
                  {idx + 1}.
                </span>

                {/* Content or editor */}
                <div className="min-w-0">
                  {editingId === step.id ? (
                    <div className="space-y-2 py-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        autoFocus
                        className="ghost-border w-full rounded-md bg-surface-container-high px-3 py-2 font-body text-sm text-on-surface focus:bg-primary-fixed focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <BiteButton
                          type="button"
                          size="md"
                          disabled={isPending || !editContent.trim()}
                          biteColor="var(--color-surface-container-lowest)"
                          onClick={() => {
                            const content = editContent.trim();
                            if (!content) return;
                            setSteps((l) => l.map((s) => s.id === step.id ? { ...s, content } : s));
                            cancelEdit();
                            startTransition(async () => {
                              await updateRecipeStepAction(step.id, productId, recipeId, content);
                            });
                          }}
                        >
                          Save
                        </BiteButton>
                        <BiteButton type="button" size="md" variant="ghost" onClick={cancelEdit}>
                          Discard
                        </BiteButton>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="cursor-text font-body text-sm leading-snug text-on-surface"
                      onClick={() => startEdit(step)}
                      title="Click to edit"
                    >
                      {step.content}
                    </p>
                  )}
                </div>

                {/* Delete — always rendered to hold the grid column */}
                <div className="self-start pt-0.5">
                  {editingId !== step.id && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        await deleteRecipeStepAction(step.id, productId, recipeId);
                        setSteps((l) => l.filter((s) => s.id !== step.id));
                      })}
                      className="text-on-surface-variant/30 hover:text-on-error-container transition-colors disabled:opacity-40"
                      aria-label="Delete step"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
      )}

      {/* Add step */}
      <div className="flex items-end gap-2 pt-1">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
          rows={1}
          placeholder={`Step ${steps.length + 1}…`}
          className="ghost-border flex-1 rounded-md bg-surface-container-high px-3 py-3 font-body text-sm leading-6 text-on-surface focus:bg-primary-fixed focus:outline-none"
        />
        <BiteButton
          type="button"
          size="md"
          disabled={isPending || !newContent.trim()}
          biteColor="var(--color-surface-container-lowest)"
          onClick={handleAdd}
        >
          + Add step
        </BiteButton>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 4 13 4" />
      <path d="M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4" />
      <path d="M4 4l.8 9.2A.5.5 0 0 0 5.3 14h5.4a.5.5 0 0 0 .5-.8L12 4" />
    </svg>
  );
}
