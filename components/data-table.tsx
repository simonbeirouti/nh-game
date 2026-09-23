"use client"

import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    basic: sortFn_basic,
    text: sortFn_text,
  },
  filterFns: {
    includesString: filterFn_includesString,
  },
})

export type DataTableColumn<TData extends Record<string, unknown>> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  unknown
>

function activateRow<TData extends Record<string, unknown>>(
  event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>,
  row: TData,
  onRowActivate?: (row: TData) => void
) {
  if (!onRowActivate) return
  if ("key" in event && event.key !== "Enter" && event.key !== " ") return
  if ((event.target as HTMLElement).closest("a,button,input,textarea,select"))
    return
  if ("key" in event) event.preventDefault()
  onRowActivate(row)
}

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  globalFilter,
  onGlobalFilterChange,
  pageSize = 25,
  empty,
  rowClassName,
  rowLabel,
  onRowActivate,
}: {
  columns: DataTableColumn<TData>[]
  data: TData[]
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  pageSize?: number
  empty: ReactNode
  rowClassName?: (row: TData) => string
  rowLabel?: (row: TData) => string
  onRowActivate?: (row: TData) => void
}) {
  const [paginationState, setPaginationState] = useState({
    data,
    globalFilter,
    pageSize,
    value: { pageIndex: 0, pageSize },
  })
  const pagination =
    paginationState.data === data &&
    paginationState.globalFilter === globalFilter &&
    paginationState.pageSize === pageSize
      ? paginationState.value
      : { pageIndex: 0, pageSize }
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    state: { globalFilter, pagination },
    onPaginationChange: (updater) => {
      const value =
        typeof updater === "function" ? updater(pagination) : updater
      setPaginationState({
        data,
        globalFilter,
        pageSize,
        value,
      })
    },
    globalFilterFn: "includesString",
    onGlobalFilterChange: (updater) =>
      onGlobalFilterChange(
        typeof updater === "function" ? updater(globalFilter) : updater
      ),
    autoResetPageIndex: true,
    sortDescFirst: false,
  })

  const rows = table.getRowModel().rows
  const pageCount = Math.max(1, table.getPageCount())
  const page = table.state.pagination.pageIndex + 1

  return (
    <div className="flex flex-col gap-4">
      {rows.length ? (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const direction = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        direction === "asc"
                          ? "ascending"
                          : direction === "desc"
                            ? "descending"
                            : sortable
                              ? "none"
                              : undefined
                      }
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          {direction === "asc" ? (
                            <ArrowUpIcon data-icon="inline-end" />
                          ) : direction === "desc" ? (
                            <ArrowDownIcon data-icon="inline-end" />
                          ) : (
                            <ArrowUpDownIcon data-icon="inline-end" />
                          )}
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(rowClassName?.(row.original))}
                tabIndex={onRowActivate ? 0 : undefined}
                aria-label={rowLabel?.(row.original)}
                onClick={(event) =>
                  activateRow(event, row.original, onRowActivate)
                }
                onKeyDown={(event) =>
                  activateRow(event, row.original, onRowActivate)
                }
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        empty
      )}

      {pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Previous
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}
