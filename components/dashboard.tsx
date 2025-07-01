
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle } from "lucide-react"
import TableRelationships, { type NestedData } from "@/lib/table-relationships"
import { SidebarProvider } from "@/components/ui/sidebar"
import DashboardSidebar from "@/components/dashboard-sidebar"
import RelationshipTable from "@/components/relationship-table"
import FlatRelationshipTable from "@/components/flat-relationship-table"
import MultiFlatRelationshipTable from "@/components/multi-flat-relationship-table"
import ResultsTable from "@/components/results-table"
import ColumnSelector from "@/components/column-selector"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Definição das colunas disponíveis por tabela
export const tableColumns: Record<string, string[]> = {
  Linha: ["codigo", "letreironumerico", "modooperacao", "modocircular", "sentido", "descritivoprincipal", "descritivosecundario"],
  LinhaParada: ["codigolinha", "codigoparada"],
  Parada: ["codigo", "nome", "latitude", "longitude", "endereco"],
  Veiculo: ["prefixo", "acessopcd"],
  Corredor: ["codigo", "nome"],
  Itinerario: ["codigolinha", "prefixoveiculo", "datareferencia", "codigoparada", "previsaochegada"],
};

// Mapeamento de relacionamentos aninhados (arrays)
const nestedRelationships: Record<string, { key: string; mainTable: string; relTable: string }> = {
  "Linha-LinhaParada": { key: "linhaparada", mainTable: "Linha", relTable: "LinhaParada" },
  "Linha-Itinerario": { key: "itinerario", mainTable: "Linha", relTable: "Itinerario" },
  "Corredor-Parada": { key: "paradas", mainTable: "Corredor", relTable: "Parada" },
}

// Mapeamento de relacionamentos planos (objetos únicos)
const flatRelationships: Record<string, { key: string; mainTable: string; relTable: string }> = {
  "LinhaParada-Parada": { key: "parada", mainTable: "LinhaParada", relTable: "Parada" },
  "LinhaParada-Linha": { key: "linha", mainTable: "LinhaParada", relTable: "Linha" },
  "Itinerario-Linha": { key: "linha", mainTable: "Itinerario", relTable: "Linha" },
  "Itinerario-Parada": { key: "parada", mainTable: "Itinerario", relTable: "Parada" },
  "Itinerario-Veiculo": { key: "veiculo", mainTable: "Itinerario", relTable: "Veiculo" },
  "Parada-Corredor": { key: "corredor", mainTable: "Parada", relTable: "Corredor" },
}

interface ApiResponse {
  success: boolean
  data?: any[]
  count?: number
  error?: string
}

export default function Dashboard() {
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [availableTables, setAvailableTables] = useState<string[]>(Object.keys(TableRelationships))
  const [results, setResults] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({})
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)

  // Atualiza as tabelas disponíveis com base nas seleções atuais
  useEffect(() => {
    if (selectedTables.length === 0) {
      setAvailableTables(Object.keys(TableRelationships))
    } else {
      const relatedTables = new Set<string>()
      selectedTables.forEach((table) => relatedTables.add(table))
      selectedTables.forEach((table) => {
        if (TableRelationships[table]) {
          TableRelationships[table].forEach((relatedTable) => {
            relatedTables.add(relatedTable)
          })
        }
      })
      setAvailableTables(Array.from(relatedTables))
    }
  }, [selectedTables])

  // Inicializa as colunas selecionadas quando as tabelas mudam
  useEffect(() => {
    const newSelectedColumns: Record<string, string[]> = {}

    selectedTables.forEach((table) => {
      if (selectedColumns[table]) {
        newSelectedColumns[table] = selectedColumns[table]
      } else {
        newSelectedColumns[table] = [...(tableColumns[table] || [])]
      }
    })

    setSelectedColumns(newSelectedColumns)
  }, [selectedTables])

  // Função para buscar dados da API real
  const fetchData = async () => {
    if (selectedTables.length === 0) {
      setError("Selecione pelo menos uma tabela")
      return
    }

    setLoading(true)
    setError(null)
    setApiResponse(null)

    try {
      console.log("Dashboard: Enviando requisição para API:", {
        tables: selectedTables,
        fields: selectedColumns,
        limit: 50,
      })

      const response = await fetch("/api/relatorio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tables: selectedTables,
          fields: selectedColumns,
          limit: 50,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`)
      }

      const apiData: ApiResponse = await response.json()
      setApiResponse(apiData)

      if (apiData.success && apiData.data) {
        console.log("Dashboard: Dados recebidos da API:", apiData.data)
        console.log("Dashboard: Primeiro item:", JSON.stringify(apiData.data[0], null, 2))
        setResults(apiData.data)
      } else {
        throw new Error(apiData.error || "Erro desconhecido na API")
      }
    } catch (err: any) {
      console.error("Dashboard: Erro ao buscar dados:", err)
      setError(err.message || "Erro ao buscar dados. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Verifica se há relacionamento aninhado (array) e retorna as informações
  const getNestedRelationshipInfo = (tables: string[]) => {
    if (tables.length !== 2) return null

    const sortedTables = tables.sort()
    const relationshipKey = sortedTables.join("-")
    return nestedRelationships[relationshipKey] || null
  }

  // Verifica se há relacionamento plano (objeto único) e retorna as informações
  const getFlatRelationshipInfo = (tables: string[]) => {
    if (tables.length !== 2) return null

    const sortedTables = tables.sort()
    const relationshipKey = sortedTables.join("-")
    return flatRelationships[relationshipKey] || null
  }

  // Detecta múltiplos relacionamentos planos nos dados
  const getMultipleFlatRelationships = (data: any[], tables: string[]) => {
    if (!data || data.length === 0 || tables.length < 3) return null

    const firstItem = data[0]
    const relationships: Array<{ key: string; table: string }> = []

    console.log("Dashboard: Detectando relacionamentos no primeiro item:", firstItem)
    console.log("Dashboard: Tabelas selecionadas:", tables)

    // Mapear chaves de relacionamento para nomes de tabelas
    const relationshipKeyToTable: Record<string, string> = {
      linha: "Linha",
      parada: "Parada",
      veiculo: "Veiculo",
      corredor: "Corredor",
    }

    // Verificar quais relacionamentos existem nos dados
    Object.keys(relationshipKeyToTable).forEach((key) => {
      const tableName = relationshipKeyToTable[key]
      console.log(`Dashboard: Verificando relacionamento ${key} -> ${tableName}`)
      console.log(`Dashboard: Existe no item?`, firstItem[key])
      console.log(`Dashboard: Tabela selecionada?`, tables.includes(tableName))

      if (
        firstItem[key] &&
        typeof firstItem[key] === "object" &&
        !Array.isArray(firstItem[key]) &&
        tables.includes(tableName)
      ) {
        console.log(`Dashboard: Relacionamento ${key} -> ${tableName} detectado!`)
        relationships.push({ key, table: tableName })
      }
    })

    console.log("Dashboard: Relacionamentos detectados:", relationships)
    return relationships.length > 0 ? relationships : null
  }

  // Detecta o tipo de relacionamento baseado nos dados retornados
  const detectRelationshipType = (data: any[], relationshipKey: string) => {
    if (!data || data.length === 0) return "none"

    const firstItem = data[0]
    const relationshipData = firstItem[relationshipKey]

    if (!relationshipData) return "none"
    if (Array.isArray(relationshipData)) return "array"
    if (typeof relationshipData === "object") return "object"

    return "none"
  }

  // Obter todas as colunas visíveis para a tabela de resultados
  const getVisibleColumns = () => {
    const columns: string[] = []

    Object.entries(selectedColumns).forEach(([table, tableColumns]) => {
      tableColumns.forEach((column) => {
        if (!columns.includes(column)) {
          columns.push(column)
        }
      })
    })

    return columns
  }

  // Determinar qual componente de tabela usar
  const renderResultsTable = () => {
    if (!results) return null

    console.log("Dashboard: Renderizando tabela com dados:", results.length, "registros")

    // Primeiro, verifica múltiplos relacionamentos planos
    const multipleRelationships = getMultipleFlatRelationships(results, selectedTables)
    if (multipleRelationships) {
      console.log("Dashboard: Usando MultiFlatRelationshipTable")
      return (
        <MultiFlatRelationshipTable
          data={results}
          selectedColumns={selectedColumns}
          relationshipMappings={multipleRelationships}
        />
      )
    }

    // Depois, verifica relacionamentos aninhados (arrays)
    const nestedRelationshipInfo = getNestedRelationshipInfo(selectedTables)
    if (nestedRelationshipInfo) {
      const { mainTable, relTable, key } = nestedRelationshipInfo
      const relationshipType = detectRelationshipType(results, key)

      if (relationshipType === "array") {
        console.log("Dashboard: Usando RelationshipTable")
        const mainTableColumns = selectedColumns[mainTable] || []
        const relationshipColumns = selectedColumns[relTable] || []

        return (
          <RelationshipTable
            data={results as NestedData[]}
            mainTableColumns={mainTableColumns}
            relationshipTableName={relTable}
            relationshipColumns={relationshipColumns}
            relationshipKey={key}
          />
        )
      }
    }

    // Depois, verifica relacionamentos planos simples (objetos únicos)
    const flatRelationshipInfo = getFlatRelationshipInfo(selectedTables)
    if (flatRelationshipInfo) {
      const { mainTable, relTable, key } = flatRelationshipInfo
      const relationshipType = detectRelationshipType(results, key)

      if (relationshipType === "object") {
        console.log("Dashboard: Usando FlatRelationshipTable")
        const mainTableColumns = selectedColumns[mainTable] || []
        const relationshipColumns = selectedColumns[relTable] || []

        return (
          <FlatRelationshipTable
            data={results}
            mainTableColumns={mainTableColumns}
            relationshipColumns={relationshipColumns}
            relationshipKey={key}
          />
        )
      }
    }

    // Caso contrário, usa a tabela normal
    console.log("Dashboard: Usando ResultsTable padrão")
    return <ResultsTable data={results} visibleColumns={getVisibleColumns()} />
  }

  // Determinar o tipo de relacionamento para exibição
  const getRelationshipDisplayType = () => {
    if (!results || results.length === 0) return null

    const multipleRelationships = getMultipleFlatRelationships(results, selectedTables)
    if (multipleRelationships) {
      return `Múltiplos Relacionamentos (${multipleRelationships.length})`
    }

    const nestedInfo = getNestedRelationshipInfo(selectedTables)
    if (nestedInfo) {
      const relationshipType = detectRelationshipType(results, nestedInfo.key)
      if (relationshipType === "array") return "Relacionamento Aninhado (Array)"
    }

    const flatInfo = getFlatRelationshipInfo(selectedTables)
    if (flatInfo) {
      const relationshipType = detectRelationshipType(results, flatInfo.key)
      if (relationshipType === "object") return "Relacionamento Plano (Objeto)"
    }

    return null
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar
          availableTables={availableTables}
          selectedTables={selectedTables}
          setSelectedTables={setSelectedTables}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard de Itinerários</h1>
              <p className="text-muted-foreground">
                Visualize dados de transporte público com relacionamentos aninhados.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {selectedTables.length > 0 && (
                <ColumnSelector
                  selectedTables={selectedTables}
                  selectedColumns={selectedColumns}
                  setSelectedColumns={setSelectedColumns}
                />
              )}
              <Button
                onClick={fetchData}
                disabled={selectedTables.length === 0 || loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Buscar Dados"
                )}
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-lg font-medium">Tabelas Selecionadas</h2>
            <div className="flex flex-wrap gap-2">
              {selectedTables.length > 0 ? (
                selectedTables.map((table) => (
                  <Badge key={table} variant="secondary" className="text-sm">
                    {table}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tabela selecionada. Selecione tabelas no menu lateral.
                </p>
              )}
            </div>
          </div>

          {/* Informações da API Response */}
          {apiResponse && (
            <div className="mb-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {apiResponse.success ? (
                    <span className="text-green-600">
                      ✅ Consulta realizada com sucesso! {apiResponse.count} registros encontrados.
                    </span>
                  ) : (
                    <span className="text-red-600">❌ Erro na consulta: {apiResponse.error}</span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <strong>Erro:</strong> {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Resultados da Consulta
                {getRelationshipDisplayType() && (
                  <Badge variant="outline" className="ml-2">
                    {getRelationshipDisplayType()}
                  </Badge>
                )}
                {apiResponse?.count && (
                  <Badge variant="secondary" className="ml-2">
                    {apiResponse.count} registros
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Consultando banco de dados...</p>
                  </div>
                </div>
              ) : results ? (
                renderResultsTable()
              ) : (
                <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
                  <div>
                    <p>Selecione tabelas no menu lateral e clique em "Buscar Dados"</p>
                    <p className="text-sm">Os resultados da API aparecerão aqui</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  )
}
