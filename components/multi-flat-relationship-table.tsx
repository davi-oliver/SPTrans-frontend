
"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import ResultsFilter from "@/components/results-filter"

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

interface MultiFlatRelationshipTableProps {
  data: any[]
  selectedColumns: Record<string, string[]>
  relationshipMappings: Array<{ key: string; table: string }>
}

export default function MultiFlatRelationshipTable({
  data,
  selectedColumns,
  relationshipMappings,
}: MultiFlatRelationshipTableProps) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 10

  // Determinar a tabela principal (primeira tabela que não é um relacionamento)
  const getMainTable = () => {
    const allTables = Object.keys(selectedColumns)
    const relationshipTables = relationshipMappings.map((r) => r.table)
    return allTables.find((table) => !relationshipTables.includes(table)) || allTables[0]
  }

  const mainTable = getMainTable()

  // Achatar os dados combinando campos principais com campos de múltiplos relacionamentos
  const flattenData = (data: any[]) => {
    return data.map((item, index) => {
      const flatItem: any = { _originalIndex: index }

      // Adicionar campos da tabela principal
      const mainTableColumns = selectedColumns[mainTable] || []
      mainTableColumns.forEach((column) => {
        flatItem[column] = item[column]
      })

      // Adicionar campos de cada relacionamento
      relationshipMappings.forEach(({ key, table }) => {
        const relationshipData = item[key]
        if (relationshipData && typeof relationshipData === "object" && !Array.isArray(relationshipData)) {
          const relationshipColumns = selectedColumns[table] || []
          relationshipColumns.forEach((column) => {
            // Prefixar com o nome da tabela para evitar conflitos
            const prefixedColumn = `${table.toLowerCase()}_${column}`
            flatItem[prefixedColumn] = relationshipData[column]
          })
        }
      })

      return flatItem
    })
  }

  // Construir lista de todas as colunas com prefixos
  const getAllColumns = () => {
    const columns: string[] = []

    // Colunas da tabela principal
    const mainTableColumns = selectedColumns[mainTable] || []
    columns.push(...mainTableColumns)

    // Colunas dos relacionamentos (com prefixo)
    relationshipMappings.forEach(({ table }) => {
      const relationshipColumns = selectedColumns[table] || []
      relationshipColumns.forEach((column) => {
        columns.push(`${table.toLowerCase()}_${column}`)
      })
    })

    return columns
  }

  const allColumns = getAllColumns()

  // Aplicar filtros aos dados
  const applyFilters = (data: any[], filters: FilterCondition[]) => {
    if (filters.length === 0) return data

    return data.filter((item) => {
      return filters.every((filter) => {
        const { column, operator, value } = filter
        const itemValue = item[column]

        if (itemValue === undefined || itemValue === null) return false

        const itemValueStr = String(itemValue).toLowerCase()
        const filterValueStr = value.toLowerCase()

        switch (operator) {
          case "eq":
            return itemValueStr === filterValueStr
          case "neq":
            return itemValueStr !== filterValueStr
          case "gt":
            return Number(itemValue) > Number(value)
          case "gte":
            return Number(itemValue) >= Number(value)
          case "lt":
            return Number(itemValue) < Number(value)
          case "lte":
            return Number(itemValue) <= Number(value)
          case "contains":
            return itemValueStr.includes(filterValueStr)
          case "startsWith":
            return itemValueStr.startsWith(filterValueStr)
          case "endsWith":
            return itemValueStr.endsWith(filterValueStr)
          default:
            return true
        }
      })
    })
  }

  // Aplicar pesquisa global
  const applySearch = (data: any[], query: string) => {
    if (!query.trim()) return data

    const searchLower = query.toLowerCase()
    return data.filter((item) => {
      return allColumns.some((column) => {
        const value = item[column]
        if (value === undefined || value === null) return false
        return String(value).toLowerCase().includes(searchLower)
      })
    })
  }

  // Aplicar ordenação
  const applySorting = (data: any[], sortConfig: { column: string; direction: "asc" | "desc" } | null) => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.column]
      const bValue = b[sortConfig.column]

      if (aValue === undefined || aValue === null) return sortConfig.direction === "asc" ? -1 : 1
      if (bValue === undefined || bValue === null) return sortConfig.direction === "asc" ? 1 : -1

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
      }

      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()
      return sortConfig.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
    })
  }

  // Processar dados com achatamento, filtros, pesquisa e ordenação
  const processedData = useMemo(() => {
    let result = flattenData(data)
    result = applyFilters(result, filters)
    result = applySearch(result, searchQuery)
    result = applySorting(result, sortConfig)
    return result
  }, [data, filters, searchQuery, sortConfig, selectedColumns, relationshipMappings])

  // Calcular paginação
  const totalPages = Math.ceil(processedData.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = processedData.slice(startIndex, endIndex)

  // Alternar ordenação
  const toggleSort = (column: string) => {
    if (sortConfig?.column === column) {
      setSortConfig({
        column,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      })
    } else {
      setSortConfig({ column, direction: "asc" })
    }
  }

  // Função para renderizar o valor da célula
  const renderCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return "-"
    }

    if (typeof value === "boolean") {
      return value ? "Sim" : "Não"
    }

    if (typeof value === "number") {
      return value.toLocaleString()
    }

    // Formatação especial para datas
    if (typeof value === "string" && value.includes("T") && value.includes("Z")) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleString("pt-BR")
        }
      } catch {
        // Se não conseguir parsear como data, retorna como string
      }
    }

    return value.toString()
  }

  // Resetar para a primeira página quando os filtros ou a pesquisa mudam
  const handleFiltersChange = (newFilters: FilterCondition[]) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  // Obter nome da coluna formatado com indicação da tabela de origem
  const getColumnDisplayName = (column: string) => {
    // Se a coluna tem prefixo (relacionamento)
    if (column.includes("_")) {
      const [tablePrefix, columnName] = column.split("_")
      const tableName = tablePrefix.charAt(0).toUpperCase() + tablePrefix.slice(1)
      const formattedColumn = columnName.charAt(0).toUpperCase() + columnName.slice(1)
      return (
        <div className="flex flex-col">
          <span className="font-medium">{formattedColumn}</span>
          <Badge variant="outline" className="text-xs mt-1">
            {tableName}
          </Badge>
        </div>
      )
    }

    // Coluna da tabela principal
    const formattedColumn = column.charAt(0).toUpperCase() + column.slice(1)
    return (
      <div className="flex flex-col">
        <span className="font-medium">{formattedColumn}</span>
        <Badge variant="secondary" className="text-xs mt-1">
          {mainTable}
        </Badge>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Pesquisar em todas as colunas..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-md"
        />
      </div>

      <ResultsFilter columns={allColumns} onApplyFilters={handleFiltersChange} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {allColumns.map((column) => (
                <TableHead key={column} className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort(column)}
                    className="flex flex-col items-center gap-1 p-2 font-medium hover:bg-transparent w-full"
                  >
                    {getColumnDisplayName(column)}
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <TableRow key={item._originalIndex || index}>
                  {allColumns.map((column) => (
                    <TableCell key={`${index}-${column}`} className="text-center">
                      {renderCellValue(item[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) setPage(page - 1)
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = i + 1
              if (totalPages > 5) {
                if (page > 3) {
                  pageNum = page - 3 + i
                }
                if (page > totalPages - 2) {
                  pageNum = totalPages - 4 + i
                }
              }
              return (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={page === pageNum}
                    onClick={(e) => {
                      e.preventDefault()
                      setPage(pageNum)
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) setPage(page + 1)
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        Mostrando {currentItems.length} de {processedData.length} resultados
      </div>
    </div>
  )
}
