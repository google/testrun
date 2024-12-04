import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-certificate-upload-button',

  imports: [MatButtonModule],
  templateUrl: './certificate-upload-button.component.html',
  styleUrl: './certificate-upload-button.component.scss',
})
export class CertificateUploadButtonComponent {
  @Output() fileChanged = new EventEmitter<File>();
  fileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (fileList && fileList.length < 1) {
      return;
    }

    // @ts-expect-error fileList is not null at this point
    const file: File = fileList[0];

    this.fileChanged.emit(file);
    input.value = '';
    input.dispatchEvent(new Event('change'));
  }
}
