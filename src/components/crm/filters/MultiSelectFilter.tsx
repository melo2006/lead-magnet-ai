import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: SelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelectFilter = ({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: MultiSelectFilterProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const normalizedOptions = useMemo(
    () =>
      options
        .filter((option) => option.value.trim().length > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [options],
  );

  const selectedLabels = useMemo(
    () =>
      normalizedOptions
        .filter((option) => selected.includes(option.value))
        .map((option) => option.label),
    [normalizedOptions, selected],
  );

  const showSearch = normalizedOptions.length > 8;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;

    const query = search.trim().toLowerCase();
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [normalizedOptions, search]);

  const visibleValues = filteredOptions.map((option) => option.value);
  const allVisibleSelected = visibleValues.length > 0 && visibleValues.every((value) => selected.includes(value));

  const toggleValue = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      onChange(selected.filter((value) => !visibleValues.includes(value)));
      return;
    }

    onChange([...new Set([...selected, ...visibleValues])]);
  };

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-1 rounded border px-2 py-1 text-left text-xs transition-colors",
              selected.length > 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-secondary text-foreground",
            )}
          >
            <span className="truncate text-[11px]">{displayText}</span>
            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={6} className="w-64 max-w-[calc(100vw-2rem)] p-0">
          {/* Dropdown panel uses slightly lighter bg for contrast */}
          {showSearch && (
            <div className="border-b border-muted-foreground/20 p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full rounded-md border border-border bg-secondary py-1 pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-b border-muted-foreground/20 px-2 py-1.5">
            <button
              type="button"
              onClick={toggleVisible}
              className="text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
            >
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>

            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No matches</p>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selected.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isChecked ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none h-3.5 w-3.5 rounded-none border-muted-foreground/60 data-[state=checked]:border-primary"
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MultiSelectFilter;