"use client";
/* eslint-disable react-hooks/incompatible-library */

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";

type Row = {
  id: string;
  name: string;
  app: string;
  risk: string;
  status: string;
  health: string;
  executionMode: string;
  lastRun: string;
  successRate: string;
};

const column = createColumnHelper<Row>();

const columns = [
  column.accessor("name", {
    header: "Command",
    cell: (ctx) => <Link href={`/commands/${ctx.row.original.id}`} className="text-lime-200 hover:underline">{ctx.getValue()}</Link>,
  }),
  column.accessor("app", { header: "App" }),
  column.accessor("risk", { header: "Risk" }),
  column.accessor("status", { header: "Status", cell: (ctx) => <StatusBadge value={ctx.getValue()} /> }),
  column.accessor("health", { header: "Health", cell: (ctx) => <StatusBadge value={ctx.getValue()} /> }),
  column.accessor("executionMode", { header: "Execution mode" }),
  column.accessor("lastRun", { header: "Last run" }),
  column.accessor("successRate", { header: "Success rate" }),
];

export function CommandsDataTable({ rows }: { rows: Row[] }) {
  "use no memo";
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-[var(--muted-text)]">{rows.length} commands</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}




