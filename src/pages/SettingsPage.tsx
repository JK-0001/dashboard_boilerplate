/**
 * Settings — theme switch + the per-project re-brand checklist.
 */
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Paintbrush, Navigation, Type, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appConfig";

const CHECKLIST = [
  {
    icon: Paintbrush,
    title: "Re-theme",
    body: "Edit src/styles/theme.css — change the hues, keep the lightness/saturation. That single file re-brands every component.",
  },
  {
    icon: Type,
    title: "Rename",
    body: "Edit src/lib/appConfig.ts — APP_NAME, brand icon, currency locale/symbol.",
  },
  {
    icon: Navigation,
    title: "Navigation",
    body: "Edit src/lib/nav.ts — sidebar groups, top-bar pills, and ⌘K quick-creates all come from this one config.",
  },
  {
    icon: Database,
    title: "Data layer",
    body: "Replace src/lib/demoStore.ts with your real API (Supabase / REST). Pages talk to it only through react-query, so nothing else changes.",
  },
];

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{APP_NAME} preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Both palettes live in src/styles/theme.css (:root and .dark).
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light mode" : "Dark mode"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">New-project checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {CHECKLIST.map((item) => (
              <li key={item.title} className="flex items-start gap-3 px-4 py-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
