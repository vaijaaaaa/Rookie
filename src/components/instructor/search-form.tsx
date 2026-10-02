import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Plain GET search form — works without JS, keeps URL as source of truth. */
export function SearchForm({
  defaultValue,
  placeholder = "Search…",
  name = "q",
  children,
}: {
  defaultValue?: string;
  placeholder?: string;
  name?: string;
  children?: React.ReactNode;
}) {
  return (
    <form role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name={name} defaultValue={defaultValue} placeholder={placeholder} className="pl-8" aria-label={placeholder} />
      </div>
      {children}
    </form>
  );
}
