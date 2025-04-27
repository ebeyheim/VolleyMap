import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedMapsComponent } from './saved-maps.component';

describe('SavedMapsComponent', () => {
  let component: SavedMapsComponent;
  let fixture: ComponentFixture<SavedMapsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedMapsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SavedMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
