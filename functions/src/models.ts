import * as firebase from '@google-cloud/firestore';

export interface User {
  nome: string,
  pontuacao: number,
  circuitos_andamento?: CircuitInProgress[],
  circuitos_adicionados?: firebase.DocumentReference[]
}

export interface Circuit {
  id: string,
  nome: string,
  descricao: string,
  pontuacao: number,
  macropontos: firebase.DocumentReference[],
}

export interface Microponto {
  localizacao: firebase.GeoPoint,
  raio_marcacao: number,
  nome: string,
  descricao: string,
  visitado?: boolean,
  circuito?: string,
  id?: number
}

export interface Macroponto {
  micropontos: Microponto[]
}

export interface CircuitInProgress {
  nome: string,
  pontuacao: number,
  circuito_finalizado: boolean,
  micropontos_restantes: Microponto[]
}
