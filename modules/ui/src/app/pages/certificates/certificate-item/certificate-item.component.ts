import { Component, Input } from '@angular/core';
import { Certificate } from '../../../model/certificate';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-certificate-item',
  standalone: true,
  imports: [MatIcon, DatePipe, MatButtonModule],
  templateUrl: './certificate-item.component.html',
  styleUrl: './certificate-item.component.scss',
})
export class CertificateItemComponent {
  @Input() certificate!: Certificate;
}
