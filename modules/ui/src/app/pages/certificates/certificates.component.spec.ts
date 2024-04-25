import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificatesComponent } from './certificates.component';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatIcon } from '@angular/material/icon';
import { certificate } from '../../mocks/certificate.mock';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import SpyObj = jasmine.SpyObj;

describe('CertificatesComponent', () => {
  let component: CertificatesComponent;
  let mockLiveAnnouncer: SpyObj<LiveAnnouncer>;
  let fixture: ComponentFixture<CertificatesComponent>;

  beforeEach(async () => {
    mockLiveAnnouncer = jasmine.createSpyObj(['announce']);
    await TestBed.configureTestingModule({
      imports: [CertificatesComponent, MatIconTestingModule, MatIcon],
      providers: [{ provide: LiveAnnouncer, useValue: mockLiveAnnouncer }],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should emit closeSettingEvent when header button clicked', () => {
      const headerCloseButton = fixture.nativeElement.querySelector(
        '.certificates-drawer-header-button'
      ) as HTMLButtonElement;
      spyOn(component.closeCertificatedEvent, 'emit');

      headerCloseButton.click();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'The certificates panel is closed.'
      );
      expect(component.closeCertificatedEvent.emit).toHaveBeenCalled();
    });

    it('should emit closeSettingEvent when close button clicked', () => {
      const headerCloseButton = fixture.nativeElement.querySelector(
        '.close-button'
      ) as HTMLButtonElement;
      spyOn(component.closeCertificatedEvent, 'emit');

      headerCloseButton.click();

      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'The certificates panel is closed.'
      );
      expect(component.closeCertificatedEvent.emit).toHaveBeenCalled();
    });

    it('should have upload file button', () => {
      const uploadCertificatesButton = fixture.nativeElement.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;

      expect(uploadCertificatesButton).toBeDefined();
    });

    describe('with certificates', () => {
      beforeEach(() => {
        component.certificates = [certificate, certificate];
        fixture.detectChanges();
      });

      it('should have certificates list', () => {
        const certificateList = fixture.nativeElement.querySelectorAll(
          'app-certificate-item'
        );

        expect(certificateList.length).toEqual(2);
      });
    });
  });
});
