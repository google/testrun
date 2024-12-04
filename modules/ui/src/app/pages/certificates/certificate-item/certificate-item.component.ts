import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Certificate, CertificateStatus } from '../../../model/certificate';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { provideAnimations } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-certificate-item',

  imports: [MatIcon, MatButtonModule, MatProgressBarModule, CommonModule],
  providers: [provideAnimations()],
  templateUrl: './certificate-item.component.html',
  styleUrl: './certificate-item.component.scss',
})
export class CertificateItemComponent {
  @Input() certificate!: Certificate;
  @Output() deleteButtonClicked = new EventEmitter<string>();

  CertificateStatus = CertificateStatus;
}
