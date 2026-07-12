import Link from "next/link";
import { useRouter } from "next/router";
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> {
  to: string;
  end?: boolean;
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  activeClassName?: string;
  pendingClassName?: string;
  children?: React.ReactNode;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, end = false, ...props }, ref) => {
    const { pathname } = useRouter();
    const isActive = end
      ? pathname === to
      : pathname === to || pathname.startsWith(to + "/");

    const resolvedClass =
      typeof className === "function"
        ? className({ isActive, isPending: false })
        : cn(className, isActive && activeClassName, isActive && pendingClassName === undefined ? "" : "");

    return (
      <Link ref={ref} href={to} className={resolvedClass} {...props} />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
