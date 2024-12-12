import { Component, input, output } from '@angular/core';
import { Certificate } from '../../../../model/certificate';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { EmptyMessageComponent } from '../../../../components/empty-message/empty-message.component';

@Component({
  selector: 'app-certificates-table',
  imports: [
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    CommonModule,
    EmptyMessageComponent,
  ],
  templateUrl: './certificates-table.component.html',
  styleUrl: './certificates-table.component.scss',
})
export class CertificatesTableComponent {
  dataSource = input.required<MatTableDataSource<Certificate>>();
  selectedCertificate = input<string>();
  dataLoaded = input<boolean>(false);
  displayedColumns = input<string[]>([]);
  deleteButtonClicked = output<string>();
  trackByName(index: number, item: Certificate) {
    return item.name;
  }
}
