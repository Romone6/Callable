"use client";
/* eslint-disable react-hooks/incompatible-library */

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  eventType: string;
  actor: string;
  command: string;
  execution: string;
  createdAt: string;
};

const column = createColumnHelper<Row>();
const columns = [
  column.accessor("eventType", { header: "Event", cell: (ctx) => <StatusBadge value={ctx.getValue()} /> }),
  column.accessor("actor", { header: "Actor" }),
  column.accessor("command", { header: "Command" }),
  column.accessor("execution", { header: "Execution" }),
  column.accessor("createdAt", { header: "Time" }),
];

export function AuditLogTable({ rows }: { rows: Row[] }) {
  "use no memo";
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-dark)] p-3">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="border-b border-white/10 px-2 py-2 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-text)]">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border-b border-white/10 px-2 py-3 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</Button>
        <Button variant="secondary" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</Button>
      </div>
    </div>
  );
}




