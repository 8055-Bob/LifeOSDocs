---
name: LifeOS
description: A calm, action-oriented personal reflection companion.
colors:
  primary: "#7562B8"
  primary-container: "#EEE9FF"
  surface: "#FFFFFF"
  canvas: "#FBF9FF"
  text: "#30294B"
  text-muted: "#686177"
  today-container: "#F8F5FF"
  insight-container: "#F3EFFF"
  outline: "#E7E1F1"
typography:
  display:
    fontFamily: "system"
    fontSize: "31px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.7px"
  body:
    fontFamily: "system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "system"
    fontSize: "14px"
    fontWeight: 800
rounded:
  surface: "16px"
  compact: "12px"
spacing:
  page: "20px"
  section: "16px"
  compact: "8px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.surface}"
    height: "56px"
  surface-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "18px"
---

# Design System: LifeOS

## Overview

**Creative North Star: "Personal Day Map"**

LifeOS is an operating interface for a quiet moment in a real day: the user opens it to name a feeling, capture a thought and take a small next step. The interface is light, calm and direct, with soft violet reserved for actions that move a thought into reflection.

**Key Characteristics:**
- Clear hierarchy before decoration.
- Warmly human copy with native Android structure.
- Tonal lavender surfaces communicate context without competing with the primary action.
- One obvious action per screen.

## Colors

The palette is a high-legibility lavender workspace with violet as a deliberate action signal.

### Primary
- **Soft Violet Action:** used for the primary submit action, active navigation and links.

### Secondary
- **Lavender Today:** used only to distinguish practical daily progress.
- **Insight Lilac:** used for reflection and AI observations, never for destructive or urgent states.

### Neutral
- **Cool Canvas:** the continuous page ground.
- **White Surface:** editable and readable content areas.
- **Midnight Text:** headings and primary content.
- **Muted Slate:** supporting explanations and inactive navigation.

**The One Action Rule.** Violet belongs to the current primary action and selected destination; it is not decorative background color.

## Typography

**Display Font:** system sans-serif
**Body Font:** system sans-serif

The type system uses large, compact headings for orientation and comfortable body copy for emotional reflection. Russian text must remain readable without being compressed or treated as decorative texture.

### Hierarchy
- **Display:** 31px / 800 / 38px. Screen greeting only.
- **Headline:** 20px / 800. Section titles and current state.
- **Title:** 16px / 800. List rows, cards and action names.
- **Body:** 16px / 400 / 24px. Journal and insight copy.
- **Label:** 14px / 800. Secondary actions and state labels.

## Layout

Phone screens use 20px side gutters and a 16px rhythm between independent regions. The bottom navigation remains visible on primary destinations. On larger screens, content should stay within a readable single-column measure rather than stretching edge to edge.

## Elevation & Depth

LifeOS uses tonal separation and one-pixel outlines instead of floating shadows. A white card is a place to act; mint and pale-blue surfaces are context, not extra layers of chrome.

## Shapes

Primary surfaces and buttons use gently curved 16px corners. Compact selected controls use 10–12px corners. Pills are restricted to small tags and never become the default card shape.

## Components

### Buttons
- **Primary:** solid violet, white label, 56px minimum height and 16px corners.
- **Secondary:** pale violet surface with a violet label; use for voice capture and non-destructive alternatives.
- **Disabled:** retains layout but lowers opacity; the action label remains readable.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white for inputs and lists; tonal containers for daily actions and insights.
- **Border:** a quiet one-pixel outline; no drop shadow on outlined surfaces.

### Inputs / Fields
- **Style:** white editable area with a soft violet outline when the field invites thought capture.
- **Focus:** platform focus state must remain visible.

### Navigation
- **Style:** persistent bottom navigation with four destinations, clear active state and a moving violet indicator.
- **Touch targets:** each destination is at least 48dp tall and always remains readable.

## Do's and Don'ts

### Do:
- **Do** place the thought field near the primary action.
- **Do** give loading, recording, error and empty states explicit Russian labels.
- **Do** preserve native Back behavior and safe-area spacing.

### Don't:
- **Don't** use gradients, glass effects, decorative charts or fake metrics.
- **Don't** turn every piece of information into a card.
- **Don't** use color as the only sign of emotion or completion.
