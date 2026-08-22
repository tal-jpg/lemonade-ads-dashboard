import { setGlobalOptions } from 'firebase-functions/v2';

/**
 * FX Pulse Cloud Functions.
 *
 * Everything privileged lives here: role and plan claims, subscription
 * verification, community moderation, poll tallies and notification fan-out.
 * The client can call these, but it can never perform the underlying write.
 */

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 20,
  memory: '256MiB',
  timeoutSeconds: 60,
});

// Account lifecycle, roles, moderation, community membership.
export {
  onUserCreated,
  onUserDeleted,
  deleteAccount,
  registerPushToken,
  unregisterPushToken,
  setUserRole,
  setUserPlan,
  moderateUser,
  requestJoinCommunity,
  decideJoinRequest,
  reportContent,
} from './users';

// Signal publication, trade-state fan-out and daily performance rollups.
export { onSignalPublished, onSignalUpdated, rebuildDailyStats } from './signals';

// News, lessons, announcements, polls and community message hooks.
export {
  onNewsPublished,
  onLessonPublished,
  onAnnouncementCreated,
  onPollCreated,
  castVote,
  onMessageCreated,
} from './content';

// Store verification, webhooks and the expiry sweep.
export {
  verifyPurchase,
  restorePurchases,
  appStoreNotifications,
  playNotifications,
  expireSubscriptions,
} from './subscriptions';
