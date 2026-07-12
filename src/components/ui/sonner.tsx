import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // Click anywhere outside a toast to dismiss all of them, so a toast never
  // blocks what's behind it while you wait for it to auto-close. (Clicks on a
  // toast itself — e.g. its own close button/action — are left alone.)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.("[data-sonner-toast]")) return;
      toast.dismiss();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // richColors gives each toast type its own colour: success = green,
      // error (incl. our delete confirmations) = red, warning = orange/yellow.
      // We no longer hard-code bg/text so those per-type colours can show.
      richColors
      // A close (✕) button on every toast — positioned top-right via index.css.
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg",
          description: "group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
