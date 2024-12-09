import { TestBed } from '@angular/core/testing';
import { CertificatesStore } from './certificates.store';
import { TestRunService } from '../../services/test-run.service';
import { NotificationService } from '../../services/notification.service';
import { DatePipe } from '@angular/common';
import { of, throwError } from 'rxjs';
import { Certificate } from '../../model/certificate';

describe('CertificatesStore', () => {
  // @ts-expect-error certificatesStore is a ReturnType of CertificatesStore
  let certificatesStore: ReturnType<typeof CertificatesStore>;
  const mockCertificates: Certificate[] = [
    { name: 'Cert1', uploading: false },
    { name: 'Cert2', uploading: false },
  ];
  const testRunServiceMock = jasmine.createSpyObj('TestRunService', [
    'fetchCertificates',
    'deleteCertificate',
    'uploadCertificate',
  ]);
  const notificationServiceMock = jasmine.createSpyObj('NotificationService', [
    'notify',
  ]);
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TestRunService, useValue: testRunServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        DatePipe,
        CertificatesStore,
      ],
    });
    testRunServiceMock.fetchCertificates.and.returnValue(of(mockCertificates));

    certificatesStore = TestBed.inject(CertificatesStore);
  });

  it('should initialize with certificates fetched from the service', () => {
    certificatesStore.getCertificates();

    expect(testRunServiceMock.fetchCertificates).toHaveBeenCalled();
    expect(certificatesStore.certificates()).toEqual(mockCertificates);
  });

  it('should handle errors when fetching certificates', () => {
    testRunServiceMock.fetchCertificates.and.returnValue(throwError('Error'));

    certificatesStore.getCertificates();

    expect(certificatesStore.certificates()).toEqual([]);
  });

  it('should delete a certificate and update the store', () => {
    testRunServiceMock.deleteCertificate.and.returnValue(of(true));

    certificatesStore.deleteCertificate('Cert1');

    expect(testRunServiceMock.deleteCertificate).toHaveBeenCalledWith('Cert1');
    expect(certificatesStore.certificates()).toEqual([
      { name: 'Cert2', uploading: false },
    ]);
  });

  it('should handle errors when deleting a certificate', () => {
    testRunServiceMock.deleteCertificate.and.returnValue(throwError('Error'));

    certificatesStore.deleteCertificate('Cert1');
    expect(certificatesStore.certificates()).toEqual(mockCertificates);
  });

  it('should upload a certificate and update the store', () => {
    const mockFile = new File(['content'], 'Cert1.crt');
    const uploadedCertificates: Certificate[] = [
      { name: 'Cert1', uploading: false },
    ];
    testRunServiceMock.uploadCertificate.and.returnValue(of(true));
    testRunServiceMock.fetchCertificates.and.returnValue(
      of(uploadedCertificates)
    );

    certificatesStore.uploadCertificate(mockFile);

    expect(testRunServiceMock.uploadCertificate).toHaveBeenCalledWith(mockFile);
    expect(certificatesStore.certificates()).toEqual(uploadedCertificates);
  });

  it('should notify and revert on upload error', () => {
    const mockFile = new File(['content'], 'Cert1.pdf', {
      type: 'application/pdf',
    });
    testRunServiceMock.uploadCertificate.and.returnValue(throwError('Error'));

    certificatesStore.uploadCertificate(mockFile);

    expect(notificationServiceMock.notify).toHaveBeenCalled();
    expect(certificatesStore.certificates()).toEqual(mockCertificates);
  });
});
