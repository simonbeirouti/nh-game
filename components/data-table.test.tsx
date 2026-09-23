// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { createColumnHelper } from "@tanstack/react-table"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DataTable,
  dataTableFeatures,
  type DataTableColumn,
} from "./data-table"

type TableRow = Record<string, unknown> & {
  id: string
  name: string
  count: number
  updatedAt: number | undefined
}

const columnHelper = createColumnHelper<typeof dataTableFeatures, TableRow>()
const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    sortFn: "text",
    sortDescFirst: false,
  }),
  columnHelper.accessor("count", {
    header: "Count",
    sortFn: "basic",
    sortDescFirst: false,
  }),
  columnHelper.accessor("updatedAt", {
    header: "Updated",
    sortFn: "basic",
    sortUndefined: "last",
    sortDescFirst: false,
    cell: ({ getValue }) => getValue() ?? "Never",
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    enableSorting: false,
    enableGlobalFilter: false,
    cell: ({ row }) => <button type="button">Edit {row.original.name}</button>,
  }),
]) as DataTableColumn<TableRow>[]

const rows: TableRow[] = [
  { id: "1", name: "Zulu", count: 10, updatedAt: undefined },
  { id: "2", name: "Alpha", count: 2, updatedAt: 2_000 },
  { id: "3", name: "Mike", count: 30, updatedAt: 1_000 },
]

afterEach(cleanup)

function tableRows() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1)
}

function renderTable(
  options: {
    data?: TableRow[]
    filter?: string
    pageSize?: number
    onRowActivate?: (row: TableRow) => void
  } = {}
) {
  return render(
    <DataTable
      columns={columns}
      data={options.data ?? rows}
      globalFilter={options.filter ?? ""}
      onGlobalFilterChange={() => undefined}
      pageSize={options.pageSize ?? 25}
      rowLabel={(row) => `View ${row.name}`}
      onRowActivate={options.onRowActivate}
      empty={<p>No records</p>}
    />
  )
}

describe("DataTable", () => {
  it("cycles text sorting through ascending, descending, and original order", () => {
    renderTable()
    const sort = screen.getByRole("button", { name: /^Name/ })
    const header = sort.closest("th")

    expect(tableRows().map((row) => row.textContent)).toEqual([
      "Zulu10NeverEdit Zulu",
      "Alpha22000Edit Alpha",
      "Mike301000Edit Mike",
    ])
    expect(header?.getAttribute("aria-sort")).toBe("none")

    fireEvent.click(sort)
    expect(
      tableRows().map((row) => within(row).getAllByRole("cell")[0].textContent)
    ).toEqual(["Alpha", "Mike", "Zulu"])
    expect(header?.getAttribute("aria-sort")).toBe("ascending")

    fireEvent.click(sort)
    expect(
      tableRows().map((row) => within(row).getAllByRole("cell")[0].textContent)
    ).toEqual(["Zulu", "Mike", "Alpha"])
    expect(header?.getAttribute("aria-sort")).toBe("descending")

    fireEvent.click(sort)
    expect(
      tableRows().map((row) => within(row).getAllByRole("cell")[0].textContent)
    ).toEqual(["Zulu", "Alpha", "Mike"])
    expect(header?.getAttribute("aria-sort")).toBe("none")
  })

  it("sorts numeric and date values and leaves missing dates last", () => {
    renderTable()

    fireEvent.click(screen.getByRole("button", { name: /^Count/ }))
    expect(
      tableRows().map((row) => within(row).getAllByRole("cell")[1].textContent)
    ).toEqual(["2", "10", "30"])

    fireEvent.click(screen.getByRole("button", { name: /^Updated/ }))
    expect(
      tableRows().map((row) => within(row).getAllByRole("cell")[2].textContent)
    ).toEqual(["1000", "2000", "Never"])
  })

  it("filters before paginating and resets to the first available page", () => {
    const view = renderTable({ pageSize: 2 })
    expect(screen.getByText("Page 1 of 2")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByText("Mike")).not.toBeNull()

    view.rerender(
      <DataTable
        columns={columns}
        data={rows}
        globalFilter="alpha"
        onGlobalFilterChange={() => undefined}
        pageSize={2}
        empty={<p>No records</p>}
      />
    )

    expect(screen.getByText("Alpha")).not.toBeNull()
    expect(screen.queryByText("Mike")).toBeNull()
    expect(screen.queryByText(/Page /)).toBeNull()
  })

  it("supports keyboard row activation without hijacking action controls", () => {
    const onRowActivate = vi.fn()
    renderTable({ onRowActivate })
    const alphaRow = screen.getByRole("row", { name: "View Alpha" })

    fireEvent.click(screen.getByRole("button", { name: "Edit Alpha" }))
    expect(onRowActivate).not.toHaveBeenCalled()

    fireEvent.keyDown(alphaRow, { key: "Enter" })
    expect(onRowActivate).toHaveBeenLastCalledWith(rows[1])
    fireEvent.keyDown(alphaRow, { key: " " })
    expect(onRowActivate).toHaveBeenCalledTimes(2)
  })

  it("keeps action columns unsortable and renders an accessible empty state", () => {
    const view = renderTable()
    expect(screen.queryByRole("button", { name: /^Actions/ })).toBeNull()

    view.rerender(
      <DataTable
        columns={columns}
        data={[]}
        globalFilter=""
        onGlobalFilterChange={() => undefined}
        empty={<p role="status">No records</p>}
      />
    )
    expect(screen.getByRole("status").textContent).toBe("No records")
  })
})
