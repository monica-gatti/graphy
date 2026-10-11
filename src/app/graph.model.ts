export type Severity = 'critical' | 'major' | 'minor';

export interface GraphNode {
  id: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  mode: 'road' | 'sea';
}

export interface Incident {
  id: string;
  atMs: number; // when the incident happens, counted from the start of the demo
  edgeId: string;
  severity: Severity;
  title: string;
  description: string;
  eta: string;
}

export interface GraphData {
  name: string;
  origin: string;
  destination: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  incidents: Incident[];
}

export interface Alert extends Incident {
  raisedAt: Date;
}

export interface Route {
  nodeIds: string[];
  edgeIds: string[];
  km: number;
}
