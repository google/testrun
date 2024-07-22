/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RiskAssessmentRoutingModule } from './risk-assessment-routing.module';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RiskAssessmentComponent } from './risk-assessment.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ProfileItemComponent } from './profile-item/profile-item.component';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { ProfileFormComponent } from './profile-form/profile-form.component';

const matFormFieldDefaultOptions: MatFormFieldDefaultOptions = {
  hideRequiredMarker: true,
};

@NgModule({
  declarations: [RiskAssessmentComponent],
  imports: [
    CommonModule,
    RiskAssessmentRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSidenavModule,
    ProfileFormComponent,
    ProfileItemComponent,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: matFormFieldDefaultOptions,
    },
  ],
})
export class RiskAssessmentModule {}
