"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import type { Profile } from "@/types";

export function UserMenu({ profile }: { profile: Pick<Profile, "full_name" | "email" | "avatar_url" | "role"> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label="Account menu">
        <UserAvatar name={profile.full_name} src={profile.avatar_url} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="truncate">{profile.full_name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{profile.email}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-brand">{profile.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile"><User /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
