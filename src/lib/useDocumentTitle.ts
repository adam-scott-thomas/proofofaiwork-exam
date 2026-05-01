import { useEffect } from "react";

const SUFFIX = "PoAW Exam";

/**
 * Set the document title for the duration of the component's lifetime.
 *
 * Restores the prior title on unmount, so a transient page (404, error)
 * doesn't permanently overwrite the tab title.
 *
 * Pass `null` for raw titles you don't want suffixed.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title === null ? prev : `${title} · ${SUFFIX}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
