import { Component, ElementRef, OnDestroy, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { NetworkStore } from '../network.store';
import { ROUTE_TOKENS, TOKENS, cssToken } from '../theme';
import { GraphNode } from '../graph.model';


@Component({
  selector: 'app-graph-map',
  template: `<div #map class="map"></div>`,
  styles: `:host { display: block; position: relative; min-height: 0; } .map { position: absolute; inset: 0; }`,
})
export class GraphMap implements OnDestroy {
  private readonly store = inject(NetworkStore);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private readonly ready = signal(false);

  private map!: L.Map;
  private edgeLines = new Map<string, L.Polyline>();
  private nodeMarkers = new Map<string, L.CircleMarker>();
  private altLayer = L.layerGroup();
  private colors = { working: '', broken: '', impacted: '', outline: '', routes: [] as string[] };

  constructor() {
    // Leaflet needs a real DOM element, so create the map after the first render
    afterNextRender(() => {
      this.map = L.map(this.mapEl().nativeElement, { zoomControl: false, worldCopyJump: true });
      L.control.zoom({ position: 'topright' }).addTo(this.map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'muted-tiles', // grey filter (see styles.scss) so the graph stands out
      }).addTo(this.map);
      this.altLayer.addTo(this.map);
      this.colors = {
        working: cssToken(TOKENS.working),
        broken: cssToken(TOKENS.broken),
        impacted: cssToken(TOKENS.impacted),
        outline: cssToken(TOKENS.outline, '#fff'),
        routes: ROUTE_TOKENS.map(t => cssToken(t)),
      };
      this.ready.set(true);
    });

    // 1) Draw the base graph once the map exists and the data has loaded
    effect(() => {
      const g = this.store.graph();
      if (!this.ready() || !g || this.edgeLines.size) return;
      const byId = new Map(g.nodes.map(n => [n.id, n]));

      for (const e of g.edges) {
        const a = byId.get(e.from)!, b = byId.get(e.to)!;
        const line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: this.colors.working, weight: 2.5, dashArray: e.mode === 'sea' ? '2 6' : undefined })
          .bindTooltip(`${a.label} → ${b.label} · ${e.mode}`, { sticky: true })
          .addTo(this.map);
        this.edgeLines.set(e.id, line);
      }
      for (const n of g.nodes) {
        const isEnd = n.id === g.origin || n.id === g.destination;
        const marker = L.circleMarker([n.lat, n.lng], {
          radius: isEnd ? 8 : 5, color: this.colors.outline, weight: 2, fillColor: this.colors.working, fillOpacity: 1,
        })
          .bindTooltip(n.label, { permanent: isEnd, direction: 'right', className: isEnd ? 'city-label' : '' })
          .bindPopup(this.nodePopup(n))
          .addTo(this.map);
        this.nodeMarkers.set(n.id, marker);
      }
      this.map.fitBounds(L.featureGroup([...this.nodeMarkers.values()]).getBounds(), { padding: [30, 30] });
    });

    // 2) Edge and node colours: main route, working links, broken links
    effect(() => {
      const broken = this.store.brokenEdgeIds();
      const primary = new Set(this.store.primaryRoute()?.edgeIds ?? []);
      const dimmed = this.store.showAlternatives();
      if (!this.ready() || !this.edgeLines.size) return;

      const touched = new Set<string>();
      for (const [id, line] of this.edgeLines) {
        const isBroken = broken.has(id);
        if (isBroken) {
          const e = this.store.graph()!.edges.find(x => x.id === id)!;
          touched.add(e.from).add(e.to);
        }
        line.setStyle({
          color: isBroken ? this.colors.broken : this.colors.working,
          weight: isBroken ? 6 : primary.has(id) ? 5 : 2.5,
          opacity: isBroken ? 1 : dimmed ? 0.25 : primary.has(id) ? 0.95 : 0.55,
        });
        line.getElement()?.classList.toggle('edge-broken', isBroken);
        if (isBroken) line.bringToFront();
      }
      for (const [id, m] of this.nodeMarkers) m.setStyle({ fillColor: touched.has(id) ? this.colors.impacted : this.colors.working });
    });

    // 3) Alternative routes, each in its own colour
    effect(() => {
      const routes = this.store.alternatives();
      const show = this.store.showAlternatives();
      const highlighted = this.store.highlightedRoute();
      const g = this.store.graph();
      if (!this.ready() || !g) return;

      this.altLayer.clearLayers();
      if (!show) return;
      const byId = new Map(g.nodes.map(n => [n.id, n]));

      const lines = routes.map((r, i) => {
        const faded = highlighted !== null && highlighted !== i;
        return L.polyline(r.nodeIds.map(id => [byId.get(id)!.lat, byId.get(id)!.lng] as L.LatLngTuple), {
          color: this.colors.routes[i],
          weight: highlighted === i ? 9 : 7 - i * 1.5, // different widths, so overlapping routes stay visible
          opacity: faded ? 0.15 : 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        })
          .bindTooltip(`Route ${String.fromCharCode(65 + i)} · ${Math.round(r.km).toLocaleString()} km`, { sticky: true })
          .on('click', () => this.store.highlightedRoute.set(highlighted === i ? null : i))
          .addTo(this.altLayer);
      });
      this.nodeMarkers.forEach(m => m.bringToFront());

      // Zoom to the selected route, or to all the alternatives together
      const target = highlighted !== null ? lines[highlighted] : L.featureGroup(lines);
      if (target) this.map.flyToBounds(target.getBounds(), { padding: [40, 40], duration: 0.8 });
    });

    // 4) "Show on map" from an alert card
    effect(() => {
      const req = this.store.focusRequest();
      if (!this.ready() || !req) return;
      const line = this.edgeLines.get(req.edgeId);
      if (!line) return;
      this.map.flyToBounds(line.getBounds(), { padding: [120, 120], maxZoom: 6, duration: 1.2 });
      line.openTooltip(line.getCenter());
    });
  }

  private nodePopup(n: GraphNode): string {
    return `<strong>${n.label}</strong><br><span class="text-muted">${n.country} · ${n.lat.toFixed(2)}, ${n.lng.toFixed(2)}</span>`;
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
