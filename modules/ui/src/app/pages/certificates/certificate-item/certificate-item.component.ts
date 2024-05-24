import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Certificate } from '../../../model/certificate';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatError } from '@angular/material/form-field';

@Component({
  selector: 'app-certificate-item',
  standalone: true,
  imports: [
    MatIcon,
    MatButtonModule,
    MatProgressBarModule,
    CommonModule,
    MatError,
  ],
  providers: [provideAnimations()],
  templateUrl: './certificate-item.component.html',
  styleUrl: './certificate-item.component.scss',
})
export class CertificateItemComponent {
  @Input() certificate!: Certificate;
  @Output() deleteButtonClicked = new EventEmitter<string>();
}
