import { TestBed } from '@angular/core/testing';

import { FigurineService } from './figurine.service';

describe('FigurineService', () => {
  let service: FigurineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FigurineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
