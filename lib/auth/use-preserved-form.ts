"use client";

import { useEffect, useRef } from "react";

export function usePreservedForm() {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = ref.current;
    // React reinicia los campos al resolver una acción, incluso con { error }.
    // El evento nativo permite conservarlos durante esa fase de actualización.
    const preserve = (event: Event) => event.preventDefault();
    form?.addEventListener("reset", preserve);
    return () => form?.removeEventListener("reset", preserve);
  }, []);
  return ref;
}
