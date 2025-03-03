import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayCreationComponent } from './play-creation.component';

describe('PlayCreationComponent', () => {
  let component: PlayCreationComponent;
  let fixture: ComponentFixture<PlayCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayCreationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
