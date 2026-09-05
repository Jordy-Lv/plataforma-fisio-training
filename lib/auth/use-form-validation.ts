"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";

export function useFormValidation(
  schema: ZodType,
  values: (form: FormData) => unknown = (form) => Object.fromEntries(form),
) {
  const [error, setError] = useState<string>();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const result = schema.safeParse(values(new FormData(event.currentTarget)));
    setError(result.success ? undefined : result.error.issues[0].message);
    if (!result.success) event.preventDefault();
  }
  return { error, onSubmit };
}
