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

import { QuestionFormat } from './question';
export interface Profile {
  name: string;
  risk?: string;
  questions: Question[];
  status?: ProfileStatus;
  rename?: string;
  created?: string;
}

export type ProfileFormat = QuestionFormat;

export interface Question {
  question?: string;
  answer?: string | number[];
  default?: string | number[];
}

export enum ProfileRisk {
  HIGH = 'High',
  LIMITED = 'Limited',
}

export enum ProfileStatus {
  VALID = 'Valid',
  DRAFT = 'Draft',
  EXPIRED = 'Expired',
}

export interface RiskResultClassName {
  red: boolean;
  cyan: boolean;
}

export enum ProfileAction {
  Copy = 'Copy',
  Delete = 'Delete',
}
