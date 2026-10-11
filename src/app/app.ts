import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AlertsPanel } from './alerts-panel/alerts-panel';
import { GraphMap } from './graph-map/graph-map';
import { NetworkStore } from './network.store';
import { ROUTE_TOKENS } from './theme';

@Component({
  selector: 'app-root',
  imports: [AlertsPanel, GraphMap, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(NetworkStore);
  protected readonly routeColors = ROUTE_TOKENS.map(t => `var(${t})`);
  protected readonly clock = computed(() => {
    const s = Math.floor(this.store.elapsedMs() / 1000);
    return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly selected = computed(() => {
    const i = this.store.highlightedRoute();
    return i === null ? null : this.store.alternatives()[i] ?? null;
  });

  constructor() {
    this.store.load();
  }

  protected letter(i: number): string {
    return String.fromCharCode(65 + i);
  }

  protected delta(km: number): string {
    const base = this.store.primaryRoute()?.km ?? km;
    const pct = Math.round(((km - base) / base) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }

  protected via(nodeIds: string[]): string {
    const mid = nodeIds.slice(1, -1);
    const step = Math.max(1, Math.floor(mid.length / 3));
    return mid.filter((_, i) => i % step === 0).slice(0, 3).map(id => this.store.nodeLabel(id)).join(', ');
  }
}
