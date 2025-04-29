import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewStudentMarklistComponent } from './view-student-marklist.component';

describe('ViewStudentMarklistComponent', () => {
  let component: ViewStudentMarklistComponent;
  let fixture: ComponentFixture<ViewStudentMarklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewStudentMarklistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewStudentMarklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
