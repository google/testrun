import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CertificateItemComponent } from './certificate-item/certificate-item.component';
import { NgForOf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Certificate } from '../../model/certificate';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [MatIcon, CertificateItemComponent, NgForOf, MatButtonModule],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent {
  @Input() certificates: Certificate[] = [];
  @Output() closeCertificatedEvent = new EventEmitter<void>();

  constructor(private liveAnnouncer: LiveAnnouncer) {}

  closeCertificates() {
    this.liveAnnouncer.announce('The certificates panel is closed.');
    this.closeCertificatedEvent.emit();
  }
}
