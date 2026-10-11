import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphMap } from './graph-map';

describe('GraphMap', () => {
  let component: GraphMap;
  let fixture: ComponentFixture<GraphMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphMap],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
