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
export interface TipConfig {
  title: string;
  content: string;
  action: string;
  arrowPosition: 'left' | 'right' | 'top' | 'bottom';
  position: 'left' | 'right' | 'top' | 'bottom'; // Position related to the target
}

export const HelpTips = {
  step1: {
    title: 'Step 1:',
    content:
      'To get started testing, please select your testing interfaces in system\n' +
      'settings.',
    action: 'Go to Settings',
    position: 'bottom',
    arrowPosition: 'top',
  } as TipConfig,
  step2: {
    title: 'Step 2:',
    content: 'Create a device to start your first test attempt.',
    action: 'Create Device',
    position: 'right',
    arrowPosition: 'left',
  } as TipConfig,
  step3: {
    title: 'Step 3:',
    content: 'You can now start your first test attempt your new device.',
    action: 'Start Testrun',
    position: 'right',
    arrowPosition: 'left',
  } as TipConfig,
  step4: {
    title: 'Risk Assessment:',
    content:
      'Whilst testing is in progress, create a risk profile for the device.',
    action: 'Create risk profile',
    position: 'right',
    arrowPosition: 'left',
  } as TipConfig,
};
