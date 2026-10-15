// lib/haptics.ts
// One place for every haptic in the app, so they all feel the same.
//
// When to use which:
//   tap()     a main action: primary button, send, start, save
//   select()  choosing between options: quiz answers, chips, toggles, tabs
//   success() something finished well: saved, added to favourites, scan done
//   warn()    something was refused or hit a limit
//   error()   something failed
//
// Rule: not every touch buzzes. Lists, rows and links get the visual press
// only. Too many haptics feels cheap, too few feels dead.

import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => { p.catch(() => {}); };

export const haptics = {
  tap: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;
