export interface GraphNode { id: string; label: string; lat: number; lng: number; }
export interface GraphEdge { from: string; to: string; weight?: number; }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[]; }