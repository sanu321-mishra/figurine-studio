import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FigurineDesignerComponent } from './figurine-designer.component';

describe('FigurineDesignerComponent', () => {
  let component: FigurineDesignerComponent;
  let fixture: ComponentFixture<FigurineDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FigurineDesignerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FigurineDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
