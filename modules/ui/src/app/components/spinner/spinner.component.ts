import { Component, OnInit, inject } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],

  imports: [CommonModule],
})
export class SpinnerComponent implements OnInit {
  loaderService = inject(LoaderService);

  loader$!: Observable<boolean>;

  ngOnInit() {
    this.loader$ = this.loaderService.getLoading();
  }
}
