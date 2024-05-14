import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateItemComponent } from './certificate-item.component';
import {
  certificate,
  certificate_uploading,
} from '../../../mocks/certificate.mock';

describe('CertificateItemComponent', () => {
  let component: CertificateItemComponent;
  let fixture: ComponentFixture<CertificateItemComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificateItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificateItemComponent);
    compiled = fixture.nativeElement as HTMLElement;
    component = fixture.componentInstance;
    component.certificate = certificate;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should have certificate name', () => {
      const name = compiled.querySelector('.certificate-item-name');

      expect(name?.textContent?.trim()).toEqual('iot.bms.google.com');
    });

    describe('uploaded certificate', () => {
      it('should have certificate organization', () => {
        const organization = compiled.querySelector(
          '.certificate-item-organisation'
        );

        expect(organization?.textContent?.trim()).toEqual('Google, Inc.');
      });

      it('should have certificate expire date', () => {
        const date = compiled.querySelector('.certificate-item-expires');

        expect(date?.textContent?.trim()).toEqual('01 Sep 2024');
      });

      describe('delete button', () => {
        let deleteButton: HTMLButtonElement;
        beforeEach(() => {
          deleteButton = fixture.nativeElement.querySelector(
            '.certificate-item-delete'
          ) as HTMLButtonElement;
        });

        it('should be present', () => {
          expect(deleteButton).toBeDefined();
        });

        it('should emit delete event on delete button clicked', () => {
          const deleteSpy = spyOn(component.deleteButtonClicked, 'emit');
          deleteButton.click();

          expect(deleteSpy).toHaveBeenCalledWith('iot.bms.google.com');
        });
      });
    });

    describe('uploading certificate', () => {
      beforeEach(() => {
        component.certificate = certificate_uploading;
        fixture.detectChanges();
      });

      it('should have loader', () => {
        const loader = compiled.querySelector('mat-progress-bar');

        expect(loader).toBeDefined();
      });

      it('should have disabled delete button', () => {
        const deleteButton = fixture.nativeElement.querySelector(
          '.certificate-item-delete'
        ) as HTMLButtonElement;

        expect(deleteButton.getAttribute('disabled')).toBeTruthy();
      });
    });
  });
});
