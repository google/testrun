import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificatesTableComponent } from './certificates-table.component';
import { MatTableDataSource } from '@angular/material/table';
import {
  certificate,
  certificate_uploading,
} from '../../../../mocks/certificate.mock';

describe('CertificatesTableComponent', () => {
  let compiled: HTMLElement;
  let component: CertificatesTableComponent;
  let fixture: ComponentFixture<CertificatesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificatesTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'dataSource',
      new MatTableDataSource([certificate])
    );
    fixture.componentRef.setInput('selectedCertificate', '');
    fixture.componentRef.setInput('dataLoaded', true);
    fixture.componentRef.setInput('displayedColumns', [
      'name',
      'organisation',
      'expires',
      'status',
      'actions',
    ]);
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should have certificate name', () => {
      const name = compiled.querySelector('.cdk-row .mat-column-name');

      expect(name?.textContent?.trim()).toEqual('iot.bms.google.com');
    });

    describe('uploaded certificate', () => {
      it('should have certificate organization', () => {
        const organization = compiled.querySelector(
          '.cdk-row .mat-column-organisation'
        );

        expect(organization?.textContent?.trim()).toEqual('Google, Inc.');
      });

      it('should have certificate expire date', () => {
        const date = compiled.querySelector('.cdk-row .mat-column-expires');

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

        it('should have certificate name as part of aria-label', () => {
          expect(deleteButton?.ariaLabel?.trim()).toContain(certificate.name);
        });

        it('should emit delete event on delete button clicked', () => {
          const deleteSpy = spyOn(component.deleteButtonClicked, 'emit');
          deleteButton.click();

          expect(deleteSpy).toHaveBeenCalledWith(certificate.name);
        });
      });
    });

    describe('uploading certificate', () => {
      beforeEach(() => {
        fixture.componentRef.setInput(
          'dataSource',
          new MatTableDataSource([certificate_uploading])
        );
        fixture.detectChanges();
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
