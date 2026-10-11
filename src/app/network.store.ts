import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Alert, GraphData } from './graph.model';
import { findAlternatives, shortestPath } from './routing';

@Injectable({ providedIn: 'root' })
export class NetworkStore {
  private readonly http = inject(HttpClient);

  readonly graph = signal<GraphData | null>(null);
  readonly alerts = signal<Alert[]>([]);
  readonly elapsedMs = signal(0);
  readonly showAlternatives = signal(false);
  readonly highlightedRoute = signal<number | null>(null);
  /** Changes every time someone asks the map to zoom to an edge (nonce = so the same edge can be focused twice). */
  readonly focusRequest = signal<{ edgeId: string; nonce: number } | null>(null);

  readonly brokenEdgeIds = computed(() => new Set(this.alerts().map(a => a.edgeId)));

  readonly primaryRoute = computed(() => {
    const g = this.graph();
    return g ? shortestPath(g) : null;
  });

  readonly alternatives = computed(() => {
    const g = this.graph();
    const broken = this.brokenEdgeIds();
    return g && broken.size ? findAlternatives(g, broken, 3) : [];
  });

  private timers: ReturnType<typeof setTimeout>[] = [];
  private ticker?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  load(): void {
    this.http.get<GraphData>('/data/graph.json').subscribe(g => {
      this.graph.set(g);
      this.startScenario();
    });
  }

  /** Step 0: everything works. Each incident in the JSON is then raised at its `atMs`. */
  startScenario(): void {
    const g = this.graph();
    if (!g) return;
    this.stop();
    this.alerts.set([]);
    this.showAlternatives.set(false);
    this.highlightedRoute.set(null);
    this.elapsedMs.set(0);

    const startedAt = Date.now();
    this.ticker = setInterval(() => this.elapsedMs.set(Date.now() - startedAt), 250);
    for (const incident of g.incidents) {
      this.timers.push(
        setTimeout(() => this.alerts.update(list => [{ ...incident, raisedAt: new Date() }, ...list]), incident.atMs),
      );
    }
  }

  focusEdge(edgeId: string): void {
    this.focusRequest.set({ edgeId, nonce: Date.now() });
  }

  toggleAlternatives(): void {
    this.showAlternatives.update(v => !v);
    this.highlightedRoute.set(null);
  }

  edgeLabel(edgeId: string): string {
    const g = this.graph();
    const edge = g?.edges.find(e => e.id === edgeId);
    if (!g || !edge) return edgeId;
    const name = (id: string) => g.nodes.find(n => n.id === id)?.label ?? id;
    return `${name(edge.from)} → ${name(edge.to)}`;
  }

  nodeLabel(id: string): string {
    return this.graph()?.nodes.find(n => n.id === id)?.label ?? id;
  }

  private stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearInterval(this.ticker);
  }
}
