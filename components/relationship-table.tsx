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
import { ArrowUpDown, Eye, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import ResultsFilter from "@/components/results-filter"
import type { NestedData } from "@/lib/table-relationships"

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

interface RelationshipTableProps {
  data: NestedData[]
  mainTableColumns: string[]
  relationshipTableName: string
  relationshipColumns: string[]
  relationshipKey: string
}

export default function RelationshipTable({
  data,
  mainTableColumns,
  relationshipTableName,
  relationshipColumns,
  relationshipKey,
}: RelationshipTableProps) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: "asc" | "desc" } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRowData, setSelectedRowData] = useState<any[] | null>(null)
  const [selectedRowInfo, setSelectedRowInfo] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const itemsPerPage = 10

  // Colunas visíveis (principais + coluna "Ver Mais")
  const visibleColumns = [...mainTableColumns, "relacionamentos"]

  // Aplicar filtros aos dados
  const applyFilters = (data: NestedData[], filters: FilterCondition[]) => {
    if (filters.length === 0) return data

    return data.filter((item) => {
      return filters.every((filter) => {
        const { column, operator, value } = filter
        const itemValue = (item as any)[column]

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
  const applySearch = (data: NestedData[], query: string) => {
    if (!query.trim()) return data

    const searchLower = query.toLowerCase()
    return data.filter((item) => {
      return mainTableColumns.some((column) => {
        const value = (item as any)[column]
        if (value === undefined || value === null) return false
        return String(value).toLowerCase().includes(searchLower)
      })
    })
  }

  // Aplicar ordenação
  const applySorting = (data: NestedData[], sortConfig: { column: string; direction: "asc" | "desc" } | null) => {
    if (!sortConfig || sortConfig.column === "relacionamentos") return data

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.column]
      const bValue = (b as any)[sortConfig.column]

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

  // Processar dados com filtros, pesquisa e ordenação
  const processedData = useMemo(() => {
    let result = [...data]
    result = applyFilters(result, filters)
    result = applySearch(result, searchQuery)
    result = applySorting(result, sortConfig)
    return result
  }, [data, filters, searchQuery, sortConfig])

  // Calcular paginação
  const totalPages = Math.ceil(processedData.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = processedData.slice(startIndex, endIndex)

  // Alternar ordenação
  const toggleSort = (column: string) => {
    if (column === "relacionamentos") return

    if (sortConfig?.column === column) {
      setSortConfig({
        column,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      })
    } else {
      setSortConfig({ column, direction: "asc" })
    }
  }

  // Abrir modal com dados do relacionamento
  const openRelationshipModal = (relationshipData: any[], rowInfo: any) => {
    setSelectedRowData(relationshipData || [])
    setSelectedRowInfo(rowInfo)
    setDialogOpen(true)
  }

  // Fechar modal e limpar estado
  const closeModal = () => {
    setDialogOpen(false)
    setSelectedRowData(null)
    setSelectedRowInfo(null)
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

  // Obter nome da coluna formatado
  const getColumnDisplayName = (column: string) => {
    if (column === "relacionamentos") {
      return relationshipTableName
    }
    return column.charAt(0).toUpperCase() + column.slice(1)
  }

  // Obter dados do relacionamento
  const getRelationshipData = (item: any) => {
    if (!item || typeof item !== "object") return []
    return (item as any)[relationshipKey] || []
  }

  // Obter informações principais do item para o modal
  const getMainItemInfo = (item: any) => {
    if (!item || typeof item !== "object") {
      return "Item não identificado"
    }

    // Diferentes formas de identificar o item principal baseado no tipo
    if (item.letreironumerico && item.descritivoprincipal) {
      return `${item.letreironumerico} - ${item.descritivoprincipal}`
    }
    if (item.nome && (item.codigo || item.prefixo)) {
      return `${item.nome} (${item.codigo || item.prefixo})`
    }
    if (item.prefixo) {
      return `Veículo ${item.prefixo}`
    }
    if (item.codigo) {
      return `Código ${item.codigo}`
    }
    if (item.nome) {
      return item.nome
    }

    return "Item não identificado"
  }

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Pesquisar nas colunas principais..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-md"
        />
      </div>

      <ResultsFilter columns={mainTableColumns} onApplyFilters={handleFiltersChange} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead key={column}>
                  {column === "relacionamentos" ? (
                    <span className="font-medium">{getColumnDisplayName(column)}</span>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => toggleSort(column)}
                      className="flex items-center gap-1 p-0 font-medium hover:bg-transparent"
                    >
                      {getColumnDisplayName(column)}
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => {
                const relationshipData = getRelationshipData(item)
                return (
                  <TableRow key={index}>
                    {mainTableColumns.map((column) => (
                      <TableCell key={`${index}-${column}`}>{renderCellValue((item as any)[column])}</TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {relationshipData.length} registros
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRelationshipModal(relationshipData, item)}
                          className="h-8 gap-1 px-2"
                          disabled={relationshipData.length === 0}
                        >
                          <Eye className="h-3 w-3" />
                          Ver Mais
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Detalhes do {relationshipTableName}
              <Button variant="ghost" size="sm" onClick={closeModal} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Registros relacionados para <strong>{getMainItemInfo(selectedRowInfo)}</strong>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {selectedRowData && selectedRowData.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {relationshipColumns.map((column) => (
                        <TableHead key={column}>{getColumnDisplayName(column)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRowData.map((relItem, relIndex) => (
                      <TableRow key={relIndex}>
                        {relationshipColumns.map((column) => (
                          <TableCell key={`${relIndex}-${column}`}>{renderCellValue(relItem[column])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Nenhum registro relacionado encontrado.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
