/**
 * Drop-in replacement for react-router-dom's useSearchParams.
 * Returns [URLSearchParams, setSearchParams] — same API the pages already use.
 */
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

type Updater =
  | URLSearchParams
  | Record<string, string | null | undefined>
  | ((prev: URLSearchParams) => URLSearchParams);

type NavOptions = { replace?: boolean };

export function useSearchParams(): [URLSearchParams, (u: Updater, opts?: NavOptions) => void] {
  const router = useRouter();

  const searchParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(router.query).forEach(([k, v]) => {
      if (typeof v === "string") p.set(k, v);
      else if (Array.isArray(v) && v.length) p.set(k, v[0]);
    });
    return p;
  }, [router.query]);

  const setSearchParams = useCallback(
    (update: Updater, opts?: NavOptions) => {
      let next: URLSearchParams;
      if (update instanceof URLSearchParams) {
        next = update;
      } else if (typeof update === "function") {
        next = update(new URLSearchParams(searchParams.toString()));
      } else {
        next = new URLSearchParams(searchParams.toString());
        Object.entries(update).forEach(([k, v]) => {
          if (v == null || v === "") next.delete(k);
          else next.set(k, v);
        });
      }
      const qs = next.toString();
      const url = router.pathname + (qs ? "?" + qs : "");
      const navigate = opts?.replace === false ? router.push : router.replace;
      navigate(url, undefined, { shallow: true });
    },
    [router, searchParams]
  );

  return [searchParams, setSearchParams];
}
