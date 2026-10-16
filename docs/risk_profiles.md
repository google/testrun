<img width="200" alt="Testrun logo" src="https://user-images.githubusercontent.com/7399056/221927867-4190a4e8-a571-4e40-9c2b-65780ad9264c.png">

# Risk Profiles & Risk Assessment

Testrun includes a Risk Assessment module that evaluates potential security risks of IoT devices based on functional characteristics and security configurations. This document explains risk profiles, when they become outdated, how outdated profiles appear in the UI, and what actions users can take to resolve them.

---

## Overview

A **Risk Profile** is a structured questionnaire that records information about a device's features, communication capabilities, and operational requirements. Based on the responses:

- **Calculated Risk Level**: The system determines whether the device carries **Limited** or **High** risk.
- **Profile Statuses**:
  - `Valid`: The profile is complete, up to date, and active.
  - `Draft`: The profile is partially completed or saved for future editing.
  - `Expired` / `Outdated`: The profile has exceeded its validity period or question format requirements.
  - `Copy`: A temporary copy created from an existing profile.

---

## Outdated (Expired) Risk Profiles

### When do Risk Profiles become Outdated (Expired)?

A risk profile automatically receives the **`Expired`** status **1 year (12 months)** after its creation date.

*Note*: If new required questions are introduced while a profile is less than 12 months old, the profile status becomes **`Draft`** (not `Expired`), while the associated device status becomes **`Outdated`** (`Invalid`).

---

### Profiles Under 12 Months Old with New System Questions

Yes, if a profile is **less than 12 months old** but the system introduces **new required questions** to the risk assessment format:

1. **Profile Status Changes to `Draft` (Not `Expired`)**:
   - Because the profile is under 12 months old, it is not marked as `Expired`.
   - However, because it lacks answers for newly added required questions, internal validation fails.
   - The system automatically transitions the profile status from `Valid` to **`Draft`**.

2. **UI & Direct Editing Behavior**:
   - **Risk Assessment List**: Shows a **Draft icon** next to the profile name.
   - **Form View is Unlocked**: Unlike `Expired` profiles, a `Draft` profile is **NOT locked in read-only mode**. Users can click on it directly, answer the newly introduced questions in the form, and click **Save** to restore its status to `Valid`.

---

### What Users Can Do with Outdated Profiles

When dealing with an outdated risk profile, users can perform the following actions:

1. **View Existing Responses**:
   - Click on the outdated profile to view its read-only questionnaire responses.

2. **Copy the Outdated Profile (Recommended)**:
   - Click the profile's action menu (`...`) and select **Copy**.
   - Testrun generates a duplicate profile named `Copy of <Profile Name>`.
   - The copied profile receives a **new creation timestamp**, unlocking all form fields for editing.

3. **Update and Save as Valid**:
   - Review and update answers in the copied profile to match current device functionality.
   - Click **Save** to set the new profile status to `Valid`.

4. **Delete Obsolete Profiles**:
   - If an outdated profile is no longer needed, click the action menu (`...`) on the profile card and select **Delete** to permanently remove it.
