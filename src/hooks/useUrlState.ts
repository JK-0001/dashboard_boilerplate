/**
 * useUrlState — a single filter value backed by a URL query param, so report
 * filters survive a reload, are shareable, and can be captured by a Star and
 * restored on reopen. Drop-in replacement for useState<string> in reports.
 *
 *   const [godown, setGodown] = useUrlState("godown", "all");
 *
 * Writes use replace() (no history spam). A value equal to the default is
 * dropped from the URL to keep it clean. Only one report is open at a time, so
 * param keys are effectively scoped to the active report.
 */
import { useSearchParams } from "@/hooks/useNextSearchParams";

export function useUrlState<T extends string = string>(
  key: string,
  defaultValue = "",
): [T, (v: T) => void] {
  const [sp, setSp] = useSearchParams();
  const value = (sp.get(key) ?? defaultValue) as T;
  const setValue = (v: T) =>
    setSp({ [key]: v === defaultValue || v === "" ? null : v }, { replace: true });
  return [value, setValue];
}
