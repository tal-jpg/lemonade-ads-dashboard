import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { SectionHeader, Divider } from '../../components/ui/Common';
import { ListItemSkeleton } from '../../components/ui/Skeleton';
import { EmptyView } from '../../components/ui/StateViews';
import { PollCard } from '../../components/community/PollCard';
import {
  useActivePoll,
  useCommunityInfo,
  useJoinRequest,
  useMembers,
  useMessages,
} from '../../hooks/useCommunity';
import { useAnnouncements } from '../../hooks/useNotifications';
import { useAuthStore, useCommunityStatus } from '../../store/authStore';
import { timeAgo } from '../../utils/date';
import { truncate } from '../../utils/format';

/**
 * Community home.
 *
 * A hub rather than a chat list: status, the pinned announcement, today's
 * discussion topic, the live poll and recent activity — with the chat one tap
 * away. Members who have not been approved see the join flow instead.
 */
export default function Community() {
  const theme = useTheme();
  const router = useRouter();
  const status = useCommunityStatus();
  const profile = useAuthStore((s) => s.profile);

  const { info, loading: infoLoading } = useCommunityInfo();
  const { members, online } = useMembers();
  const { pinned: pinnedAnnouncement } = useAnnouncements(5);

  const approved = status === 'approved';

  return (
    <Screen scroll tabBarPadding>
      <View style={{ paddingTop: theme.spacing.base }}>
        <AppText variant="h1">{info?.name ?? 'Community'}</AppText>
        <View style={[styles.row, { marginTop: 6 }]}>
          <View style={[styles.presenceDot, { backgroundColor: theme.colors.profit }]} />
          <AppText variant="bodySm" color="textSecondary">
            {info?.memberCount ?? members.length} members · {online} online
          </AppText>
        </View>
      </View>

      {!approved ? (
        <JoinGate />
      ) : (
        <>
          {/* Open chat */}
          <Animated.View entering={FadeInDown.duration(320)} style={{ marginTop: theme.spacing.lg }}>
            <ChatEntry />
          </Animated.View>

          {/* Pinned announcement */}
          {pinnedAnnouncement && (
            <View style={{ marginTop: theme.spacing.xl }}>
              <SectionHeader title="Announcement" />
              <Card
                variant="surface"
                accentColor={
                  pinnedAnnouncement.level === 'critical'
                    ? theme.colors.loss
                    : pinnedAnnouncement.level === 'important'
                      ? theme.colors.warning
                      : theme.colors.primary
                }
              >
                <View style={styles.rowBetween}>
                  <Badge
                    label={pinnedAnnouncement.level}
                    tone={
                      pinnedAnnouncement.level === 'critical'
                        ? 'loss'
                        : pinnedAnnouncement.level === 'important'
                          ? 'warning'
                          : 'primary'
                    }
                    icon="megaphone-outline"
                  />
                  <AppText variant="caption" color="textTertiary">
                    {timeAgo(pinnedAnnouncement.createdAt)}
                  </AppText>
                </View>
                <AppText variant="title" style={{ marginTop: theme.spacing.sm }}>
                  {pinnedAnnouncement.title}
                </AppText>
                <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }}>
                  {pinnedAnnouncement.body}
                </AppText>
              </Card>
            </View>
          )}

          {/* Daily discussion */}
          {info?.dailyTopic && (
            <View style={{ marginTop: theme.spacing.xl }}>
              <SectionHeader title="Today's discussion" />
              <Card variant="surface" onPress={() => router.push('/chat')}>
                <View style={styles.row}>
                  <Ionicons name="chatbubbles-outline" size={17} color={theme.colors.primary} />
                  <AppText variant="title" style={styles.flex}>
                    {info.dailyTopic.title}
                  </AppText>
                </View>
                <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 8 }}>
                  {info.dailyTopic.body}
                </AppText>
                <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
                  Posted {timeAgo(info.dailyTopic.postedAt)}
                </AppText>
              </Card>
            </View>
          )}

          <ActivePollSection />

          <RecentActivity />

          {/* Members */}
          <View style={{ marginTop: theme.spacing.xl }}>
            <SectionHeader title="Members" subtitle={`${members.length} approved`} />
            {infoLoading ? (
              <ListItemSkeleton />
            ) : (
              <Card variant="surface" padded={false}>
                {members.slice(0, 6).map((member, index) => (
                  <View key={member.uid}>
                    {index > 0 && <Divider />}
                    <View style={[styles.memberRow, { padding: theme.spacing.md }]}>
                      <Avatar
                        name={member.displayName}
                        uri={member.photoURL}
                        size={36}
                        ring={member.plan === 'premium'}
                        online={(member.lastSeenAt ?? 0) > Date.now() - 5 * 60_000}
                      />
                      <View style={styles.flex}>
                        <View style={styles.row}>
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {member.displayName}
                          </AppText>
                          {member.role === 'admin' && (
                            <Ionicons name="shield-checkmark" size={12} color={theme.colors.primary} />
                          )}
                        </View>
                        {member.username && (
                          <AppText variant="caption" color="textTertiary">
                            @{member.username}
                          </AppText>
                        )}
                      </View>
                      {member.uid === profile?.uid && <Badge label="You" tone="neutral" />}
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function ChatEntry() {
  const theme = useTheme();
  const router = useRouter();
  const { messages, loading } = useMessages();
  const latest = messages.find((m) => !m.deleted);

  return (
    <Card variant="gradient" gradientColors={theme.colors.gradientSurface} onPress={() => router.push('/chat')}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="overline" color="primary">
            Trading floor
          </AppText>
          <AppText variant="h3" style={{ marginTop: 4 }}>
            Open chat
          </AppText>
          {loading ? (
            <AppText variant="bodySm" color="textTertiary" style={{ marginTop: 4 }}>
              Loading messages…
            </AppText>
          ) : latest ? (
            <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }} numberOfLines={1}>
              {latest.authorName}: {truncate(latest.text ?? 'Sent an attachment', 46)}
            </AppText>
          ) : (
            <AppText variant="bodySm" color="textTertiary" style={{ marginTop: 4 }}>
              No messages yet — start the conversation.
            </AppText>
          )}
        </View>
        <View style={[styles.chatIcon, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md }]}>
          <Ionicons name="chatbubbles" size={20} color={theme.colors.onPrimary} />
        </View>
      </View>
    </Card>
  );
}

function ActivePollSection() {
  const theme = useTheme();
  const { poll, myVote, voting, vote, loading } = useActivePoll();

  if (loading || !poll) return null;

  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <SectionHeader title="Community poll" />
      <PollCard poll={poll} myVote={myVote} voting={voting} onVote={vote} />
    </View>
  );
}

function RecentActivity() {
  const theme = useTheme();
  const { messages, loading } = useMessages();
  const recent = messages.filter((m) => !m.deleted).slice(0, 5);

  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <SectionHeader title="Recent activity" />
      {loading ? (
        <ListItemSkeleton />
      ) : recent.length === 0 ? (
        <EmptyView icon="chatbubble-ellipses-outline" title="Nothing yet today" compact />
      ) : (
        <Card variant="surface" padded={false}>
          {recent.map((message, index) => (
            <View key={message.id}>
              {index > 0 && <Divider />}
              <View style={[styles.memberRow, { padding: theme.spacing.md }]}>
                <Avatar name={message.authorName} uri={message.authorPhoto} size={30} />
                <View style={styles.flex}>
                  <AppText variant="captionStrong" color="textSecondary">
                    {message.authorName}
                  </AppText>
                  <AppText variant="bodySm" numberOfLines={1}>
                    {message.type === 'text'
                      ? message.text
                      : message.type === 'image'
                        ? 'Shared a chart'
                        : message.type === 'audio'
                          ? 'Sent a voice note'
                          : 'Sent an attachment'}
                  </AppText>
                </View>
                <AppText variant="caption" color="textTertiary">
                  {timeAgo(message.createdAt)}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

/**
 * Access flow for members who are not yet approved.
 * Removal is administrative — there is deliberately no "leave" action here.
 */
function JoinGate() {
  const theme = useTheme();
  const status = useCommunityStatus();
  const { request, submit, submitting } = useJoinRequest();
  const [message, setMessage] = useState('');

  const config = {
    none: {
      icon: 'lock-closed-outline' as const,
      tone: 'primary' as const,
      title: 'Request access',
      body: 'The trading floor is a private, moderated community. Send a request and an admin will review it.',
    },
    pending: {
      icon: 'hourglass-outline' as const,
      tone: 'warning' as const,
      title: 'Request pending',
      body: 'Your request is with the admins. You will be notified as soon as it is reviewed.',
    },
    rejected: {
      icon: 'close-circle-outline' as const,
      tone: 'loss' as const,
      title: 'Request not approved',
      body: 'Your request was not approved this time. Contact support if you believe this is a mistake.',
    },
    blocked: {
      icon: 'ban-outline' as const,
      tone: 'loss' as const,
      title: 'Access blocked',
      body: 'You cannot access the community. Contact support if you believe this is a mistake.',
    },
    approved: {
      icon: 'checkmark-circle-outline' as const,
      tone: 'profit' as const,
      title: 'Approved',
      body: '',
    },
  }[status];

  return (
    <Card variant="surface" style={{ marginTop: theme.spacing.lg }}>
      <View
        style={[
          styles.gateIcon,
          { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.lg },
        ]}
      >
        <Ionicons name={config.icon} size={26} color={theme.colors.primary} />
      </View>

      <AppText variant="h3" style={{ marginTop: theme.spacing.base }}>
        {config.title}
      </AppText>
      <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
        {config.body}
      </AppText>

      {status === 'none' && (
        <>
          <Input
            containerStyle={{ marginTop: theme.spacing.base }}
            label="Message to the admins (optional)"
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us a little about your trading experience"
            multiline
            maxLength={300}
          />
          <Button
            label="Send join request"
            loading={submitting}
            style={{ marginTop: theme.spacing.base }}
            onPress={() => void submit(message.trim() || undefined)}
          />
        </>
      )}

      {status === 'pending' && request && (
        <AppText variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
          Requested {timeAgo(request.createdAt)}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  presenceDot: { width: 7, height: 7, borderRadius: 4 },
  chatIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gateIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
