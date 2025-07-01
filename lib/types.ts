// Define os relacionamentos entre as tabelas
const TableRelationships: Record<string, string[]> = {
    Linha: ["LinhaParada", "Itinerario"],
    Corredor: ["Parada"],
    Parada: ["Corredor", "LinhaParada", "Itinerario"],
    Veiculo: ["Itinerario"],
    LinhaParada: ["Linha", "Parada"],
    Itinerario: ["Linha", "Parada", "Veiculo"],
  }
  
  // Estrutura de dados para trabalhar com dados aninhados
  export interface LinhaData {
    codigo: number
    letreironumerico: string
    descritivoprincipal: string
    linhaparada?: Array<{
      codigolinha: number
      codigoparada: number
      sequencia?: number
    }>
    itinerario?: Array<{
      codigolinha: number
      codigoveiculo: string
      datareferencia: string
      previsaochegada: string
      status: string
    }>
  }
  
  export interface ParadaData {
    codigo: number
    nome: string
    latitude: number
    longitude: number
    endereco: string
    codigocorredor?: number
    linhaparada?: Array<{
      codigolinha: number
      codigoparada: number
      sequencia?: number
    }>
    itinerario?: Array<{
      codigoparada: number
      codigoveiculo: string
      datareferencia: string
      previsaochegada: string
      status: string
    }>
  }
  
  export interface VeiculoData {
    prefixo: string
    acessopcd: boolean
    modelo: string
    itinerario?: Array<{
      codigoveiculo: string
      codigolinha: number
      codigoparada: number
      datareferencia: string
      previsaochegada: string
      status: string
    }>
  }
  
  export interface CorredorData {
    codigo: number
    nome: string
    descricao: string
    paradas?: Array<{
      codigoparada: number
      codigocorredor: number
      nome: string
      latitude: number
      longitude: number
    }>
  }
  
  export type NestedData = LinhaData | ParadaData | VeiculoData | CorredorData
  
  export default TableRelationships
  