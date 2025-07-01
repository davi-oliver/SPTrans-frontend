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
import { ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import ResultsFilter from "@/components/results-filter"
import type { LinhaData } from "@/lib/table-relationships"

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

interface NestedDataTableProps {
  data: LinhaData[]
  visibleColumns: string[]
}

export default function NestedDataTable({ data, visibleColumns }: NestedDataTableProps) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<"flat" | "nested">("nested")
  const itemsPerPage = 10

  // Função para achatar os dados aninhados
  const flattenData = (data: LinhaData[]) => {
    const flattened: any[] = []

    data.forEach((linha) => {
      if (linha.linhaparada && linha.linhaparada.length > 0) {
        linha.linhaparada.forEach((parada, index) => {
          flattened.push({
            // Dados da linha
            codigo: linha.codigo,
            letreironumerico: linha.letreironumerico,
            descritivoprincipal: linha.descritivoprincipal,
            // Dados da parada
            codigolinha: parada.codigolinha,
            codigoparada: parada.codigoparada,
            sequencia: index + 1,
            // ID único para a linha achatada
            _flatId: `${linha.codigo}-${parada.codigoparada}`,
          })
        })
      } else {
        // Se não há paradas, ainda assim inclui a linha
        flattened.push({
          codigo: linha.codigo,
          letreironumerico: linha.letreironumerico,
          descritivoprincipal: linha.descritivoprincipal,
          codigolinha: null,
          codigoparada: null,
          sequencia: null,
          _flatId: `${linha.codigo}-empty`,
        })
      }
    })

    return flattened
  }

  // Aplicar filtros aos dados
  const applyFilters = (data: any[], filters: FilterCondition[]) => {
    if (filters.length === 0) return data

    return data.filter((item) => {
      return filters.every((filter) => {
        const { column, operator, value } = filter
        const itemValue = item[column]

        if (itemValue === undefined || itemValue === null) return false

        // Converter para string para comparação
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
      return visibleColumns.some((column) => {
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

      // Lidar com valores nulos ou indefinidos
      if (aValue === undefined || aValue === null) return sortConfig.direction === "asc" ? -1 : 1
      if (bValue === undefined || bValue === null) return sortConfig.direction === "asc" ? 1 : -1

      // Comparar números
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
      }

      // Comparar strings
      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()
      return sortConfig.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString)
    })
  }

  // Processar dados com base no modo de visualização
  const processedData = useMemo(() => {
    let result: any[]

    if (viewMode === "flat") {
      result = flattenData(data)
    } else {
      result = [...data]
    }

    result = applyFilters(result, filters)
    result = applySearch(result, searchQuery)
    result = applySorting(result, sortConfig)
    return result
  }, [data, filters, searchQuery, sortConfig, viewMode])

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

  // Alternar expansão de linha
  const toggleRowExpansion = (codigo: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo)
    } else {
      newExpanded.add(codigo)
    }
    setExpandedRows(newExpanded)
  }

  // Função para renderizar o valor da célula
  const renderCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return "-"
    }

    if (typeof value === "boolean") {
      return value ? "Sim" : "Não"
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

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Pesquisar em todas as colunas..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-md"
        />
        <div className="flex gap-2">
          <Button
            variant={viewMode === "nested" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("nested")}
          >
            Visualização Aninhada
          </Button>
          <Button variant={viewMode === "flat" ? "default" : "outline"} size="sm" onClick={() => setViewMode("flat")}>
            Visualização Plana
          </Button>
        </div>
      </div>

      <ResultsFilter columns={visibleColumns} onApplyFilters={handleFiltersChange} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {viewMode === "nested" && <TableHead className="w-12"></TableHead>}
              {visibleColumns.map((column) => (
                <TableHead key={column}>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort(column)}
                    className="flex items-center gap-1 p-0 font-medium hover:bg-transparent"
                  >
                    {column}
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              viewMode === "nested" ? (
                // Visualização aninhada
                currentItems.map((linha: LinhaData, index) => (
                  <Collapsible key={linha.codigo} asChild>
                    <>
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(linha.codigo)}
                              className="p-0"
                            >
                              {expandedRows.has(linha.codigo) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        {visibleColumns.map((column) => (
                          <TableCell key={`${index}-${column}`}>
                            {column === "linhaparada" ? (
                              <Badge variant="secondary">{linha.linhaparada?.length || 0} paradas</Badge>
                            ) : (
                              renderCellValue((linha as any)[column])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length + 1} className="bg-muted/50 p-0">
                            {linha.linhaparada && linha.linhaparada.length > 0 && (
                              <div className="p-4">
                                <h4 className="mb-2 font-medium">Paradas da Linha:</h4>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                                  {linha.linhaparada.map((parada, paradaIndex) => (
                                    <div key={paradaIndex} className="rounded border p-2 text-sm">
                                      <div>
                                        <strong>Código:</strong> {parada.codigoparada}
                                      </div>
                                      <div>
                                        <strong>Linha:</strong> {parada.codigolinha}
                                      </div>
                                      <div>
                                        <strong>Sequência:</strong> {paradaIndex + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              ) : (
                // Visualização plana
                currentItems.map((item, index) => (
                  <TableRow key={item._flatId || index}>
                    {visibleColumns.map((column) => (
                      <TableCell key={`${index}-${column}`}>{renderCellValue(item[column])}</TableCell>
                    ))}
                  </TableRow>
                ))
              )
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (viewMode === "nested" ? 1 : 0)}
                  className="h-24 text-center"
                >
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
        {viewMode === "nested" && ` (${data.length} linhas principais)`}
      </div>
    </div>
  )
}
