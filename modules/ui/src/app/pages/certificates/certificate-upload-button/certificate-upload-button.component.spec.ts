import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateUploadButtonComponent } from './certificate-upload-button.component';

describe('CertificateUploadButtonComponent', () => {
  let component: CertificateUploadButtonComponent;
  let fixture: ComponentFixture<CertificateUploadButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificateUploadButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificateUploadButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DOM tests', () => {
    it('should have upload file button', () => {
      const uploadCertificatesButton = fixture.nativeElement.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;

      expect(uploadCertificatesButton).toBeDefined();
    });

    it('should have hidden file input', () => {
      const input = fixture.nativeElement.querySelector(
        '#default-file-input'
      ) as HTMLInputElement;

      expect(input).toBeDefined();
    });

    it('should emit input click on button click', () => {
      const input = fixture.nativeElement.querySelector(
        '#default-file-input'
      ) as HTMLInputElement;
      const inputSpy = spyOn(input, 'click');

      const uploadCertificatesButton = fixture.nativeElement.querySelector(
        '.browse-files-button'
      ) as HTMLButtonElement;

      uploadCertificatesButton.click();

      expect(inputSpy).toHaveBeenCalled();
    });

    it('should detect file input change and emit event', () => {
      const emitSpy = spyOn(component.fileChanged, 'emit');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([''], 'test-file.pdf'));

      const inputDebugEl = fixture.nativeElement.querySelector(
        '#default-file-input'
      ) as HTMLInputElement;

      inputDebugEl.files = dataTransfer.files;

      inputDebugEl.dispatchEvent(new InputEvent('change'));

      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
