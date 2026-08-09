"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Brain, Palette } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Companion",
      icon: Bot,
    },
    {
      href: "/memories",
      label: "Memories",
      icon: Brain,
    },
    {
      href: "/customize",
      label: "Customize",
      icon: Palette,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 h-16 z-40 flex items-center justify-around px-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-all group px-4 py-1.5 rounded-xl ${
              isActive
                ? "text-indigo-400 bg-white/5 font-semibold"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]"
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : ""
              }`}
            />
            <span className="text-[11px] tracking-wide font-medium">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
