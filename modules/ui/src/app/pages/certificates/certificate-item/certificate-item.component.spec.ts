import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateItemComponent } from './certificate-item.component';
import { certificate } from '../../../mocks/certificate.mock';

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

    it('should have delete button', () => {
      const deleteButton = fixture.nativeElement.querySelector(
        '#main .test-button'
      ) as HTMLButtonElement;

      expect(deleteButton).toBeDefined();
    });
  });
});
