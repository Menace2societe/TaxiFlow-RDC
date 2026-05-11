import { cn } from "@/lib/utils/cn";

type TableProps = React.HTMLAttributes<HTMLTableElement>;
type SectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type RowProps = React.HTMLAttributes<HTMLTableRowElement>;
type CellProps = React.ThHTMLAttributes<HTMLTableCellElement> & React.TdHTMLAttributes<HTMLTableCellElement>;

export function Table({ className, ...props }: TableProps) {
  return <table className={cn("w-full text-left text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: SectionProps) {
  return <thead className={cn("bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-400", className)} {...props} />;
}

export function TableBody({ className, ...props }: SectionProps) {
  return <tbody className={cn("divide-y divide-stone-100 dark:divide-stone-800", className)} {...props} />;
}

export function TableRow({ className, ...props }: RowProps) {
  return <tr className={cn("align-middle", className)} {...props} />;
}

export function TableHead({ className, ...props }: CellProps) {
  return <th className={cn("px-5 py-3 font-medium", className)} {...props} />;
}

export function TableCell({ className, ...props }: CellProps) {
  return <td className={cn("px-5 py-4", className)} {...props} />;
}
