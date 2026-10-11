import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NetworkStore } from '../network.store';

@Component({
  selector: 'app-alerts-panel',
  imports: [DatePipe],
  templateUrl: './alerts-panel.html',
  styleUrl: './alerts-panel.scss',
})
export class AlertsPanel {
  protected readonly store = inject(NetworkStore);
  protected readonly expandedId = signal<string | null>(null);

  protected toggle(id: string, edgeId: string): void {
    const opening = this.expandedId() !== id;
    this.expandedId.set(opening ? id : null);
    if (opening) this.store.focusEdge(edgeId);
  }
}
