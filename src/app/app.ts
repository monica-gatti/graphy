import { Component } from '@angular/core';
import { GraphMap } from './graph-map/graph-map';

@Component({
  selector: 'app-root',
  imports: [GraphMap],
  template: `<app-graph-map />`,
})
export class App {}