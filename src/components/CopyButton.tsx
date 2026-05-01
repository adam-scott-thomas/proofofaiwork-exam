/**
 * CopyButton — copies a string to clipboard, shows transient "Copied!"
 * confirmation. No deps; uses navigator.clipboard with a textarea
 * fallback for older browsers.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied!",
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer if the component unmounts mid-flash so we don't setState
  // after unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for old/insecure-origin browsers.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent: nothing graceful to do besides leaving the URL visible
      // in the page so the user can copy it manually.
    }
  }, [value]);

  return (
    <button type="button" className={className} onClick={onCopy} aria-live="polite">
      {copied ? copiedLabel : label}
    </button>
  );
}
