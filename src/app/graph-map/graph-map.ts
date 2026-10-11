import { Component, ElementRef, afterNextRender, inject, viewChild, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { GraphData } from '../graph.model';

@Component({
  selector: 'app-graph-map',
  template: `<div #map class="map"></div>`,
  styles: `.map { height: 100vh; width: 100%; }`,
})
export class GraphMap implements OnDestroy {
  private http = inject(HttpClient);
  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private map?: L.Map;

  constructor() {
    // Leaflet needs a real DOM element, so start it after the first render
    afterNextRender(() => {
      this.map = L.map(this.mapEl().nativeElement).setView([48.1, -1.6], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.http.get<GraphData>('/data/graph.json').subscribe(data => this.draw(data));
    });
  }

  private draw({ nodes, edges }: GraphData) {
    const map = this.map!;
    const byId = new Map(nodes.map(n => [n.id, n]));

    // Edges first, so the nodes are drawn on top of them
    for (const e of edges) {
      const a = byId.get(e.from), b = byId.get(e.to);
      if (!a || !b) continue;
      L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { weight: e.weight ?? 2, color: '#3367d6' })
        .bindTooltip(`${a.label} → ${b.label}`)
        .addTo(map);
    }

    const markers = nodes.map(n =>
      L.circleMarker([n.lat, n.lng], { radius: 8, color: '#d33', fillOpacity: 0.9 })
        .bindPopup(n.label)
        .addTo(map),
    );

    map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] });
  }

  ngOnDestroy() { this.map?.remove(); }
}
