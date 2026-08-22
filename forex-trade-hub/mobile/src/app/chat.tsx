import React, { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from '../components/ui/AppText';
import { StackHeader } from '../components/ui/StackHeader';
import { Input } from '../components/ui/Input';
import { IconButton } from '../components/ui/Common';
import { LoadingView, EmptyView, ErrorView } from '../components/ui/StateViews';
import { MessageBubble } from '../components/community/MessageBubble';
import { Composer } from '../components/community/Composer';
import { useMessages, useMessageActions, useMembers, useCommunityInfo } from '../hooks/useCommunity';
import { useAuthStore, useCanPostInCommunity, useCommunityStatus, useIsModerator } from '../store/authStore';
import { replyPreviewFor, searchLoadedMessages } from '../services/firebase/communityRepo';
import { dayLabel } from '../utils/date';
import type { Message, ReplyPreview } from '../types/models';

const QUICK_REACTIONS = ['👍', '🔥', '📈', '📉', '🙏', '😂'];

/**
 * Community chat.
 *
 * The room renders chronologically and anchors to the bottom, so new messages
 * arrive without a scroll jump; older pages load as the user scrolls up.
 * Long-press opens the message actions.
 */
export default function Chat() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const profile = useAuthStore((s) => s.profile);
  const status = useCommunityStatus();
  const canPost = useCanPostInCommunity();
  const isModerator = useIsModerator();

  const { info } = useCommunityInfo();
  const { online } = useMembers();
  const { messages, pinned, loading, loadingMore, hasMore, error, loadOlder } = useMessages();
  const { send, remove, react, pin } = useMessageActions();

  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState('');
  const listRef = useRef<FlashListRef<Message>>(null);

  const visible = useMemo(() => {
    if (searching && term.trim()) return searchLoadedMessages(messages, term);
    return messages;
  }, [messages, searching, term]);

  // The hook yields newest-first (the natural Firestore ordering). FlashList v2
  // has no `inverted` prop, so the room renders chronologically and is anchored
  // to the bottom instead — same result, no double-reversed indices.
  const ordered = useMemo(() => [...visible].slice().reverse(), [visible]);

  const muted = !canPost && status === 'approved';

  const onSend = useCallback(
    async (payload: Parameters<typeof send>[0]) => {
      const ok = await send({ ...payload, replyTo: replyTo ?? undefined });
      if (ok) setReplyTo(null);
      return ok;
    },
    [replyTo, send],
  );

  if (status !== 'approved') {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Community" />
        <EmptyView
          icon="lock-closed-outline"
          title="Members only"
          message="Your request to join the community has not been approved yet."
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader
        title={info?.name ?? 'Trading Floor'}
        subtitle={`${info?.memberCount ?? 0} members · ${online} online`}
        right={
          <IconButton
            icon={searching ? 'close' : 'search'}
            accessibilityLabel={searching ? 'Close search' : 'Search messages'}
            onPress={() => {
              setSearching((v) => !v);
              setTerm('');
            }}
          />
        }
      />

      {searching && (
        <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingVertical: 8 }}>
          <Input
            value={term}
            onChangeText={setTerm}
            placeholder="Search loaded messages…"
            icon="search-outline"
            autoFocus
            helper="Searches the messages currently loaded in this room."
          />
        </View>
      )}

      {pinned && !searching && (
        <Pressable
          style={[
            styles.pinned,
            {
              backgroundColor: theme.colors.warningMuted,
              borderBottomColor: theme.colors.border,
              paddingHorizontal: theme.layout.screenPadding,
            },
          ]}
        >
          <Ionicons name="pin" size={14} color={theme.colors.warning} />
          <View style={styles.flex}>
            <AppText variant="overline" tint={theme.colors.warning}>
              Pinned · {pinned.authorName}
            </AppText>
            <AppText variant="bodySm" numberOfLines={1}>
              {pinned.text ?? 'Attachment'}
            </AppText>
          </View>
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
      >
        {loading ? (
          <LoadingView label="Loading the room…" />
        ) : error ? (
          <ErrorView
            title="Unable to load community messages"
            message="Tap to retry."
            onRetry={loadOlder}
          />
        ) : visible.length === 0 ? (
          <EmptyView
            icon="chatbubble-ellipses-outline"
            title={searching ? 'No matches' : 'No messages yet'}
            message={
              searching
                ? 'Try a different search term.'
                : 'Be the first to post — share a setup or ask a question.'
            }
          />
        ) : (
          <FlashList
            ref={listRef}
            data={ordered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8 }}
            keyboardDismissMode="interactive"
            maintainVisibleContentPosition={{ autoscrollToBottomThreshold: 0.2, startRenderingFromBottom: true }}
            onStartReached={hasMore && !searching ? loadOlder : undefined}
            onStartReachedThreshold={0.4}
            ListHeaderComponent={loadingMore ? <LoadingView /> : null}
            renderItem={({ item, index }) => {
              const previous = ordered[index - 1];
              const grouped =
                !!previous &&
                previous.authorId === item.authorId &&
                item.createdAt - previous.createdAt < 4 * 60_000 &&
                !item.replyTo;

              const showDay =
                !previous || dayLabel(previous.createdAt) !== dayLabel(item.createdAt);

              return (
                <View>
                  {showDay && (
                    <View style={styles.dayDivider}>
                      <AppText variant="overline" color="textTertiary">
                        {dayLabel(item.createdAt)}
                      </AppText>
                    </View>
                  )}
                  <MessageBubble
                    message={item}
                    isMine={item.authorId === profile?.uid}
                    grouped={grouped}
                    myUid={profile?.uid ?? ''}
                    onLongPress={setSelected}
                    onReact={react}
                    onOpenMedia={(message) => {
                      if (message.media?.url) void WebBrowser.openBrowserAsync(message.media.url);
                    }}
                  />
                </View>
              );
            }}
          />
        )}

        <Composer
          uid={profile?.uid ?? ''}
          disabled={!canPost}
          disabledReason={
            muted ? 'You are muted in this community.' : 'You cannot post in this community.'
          }
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={onSend}
        />
      </KeyboardAvoidingView>

      {/* Message actions */}
      {selected && (
        <Pressable
          style={[styles.sheetBackdrop, { backgroundColor: theme.colors.scrim }]}
          onPress={() => setSelected(null)}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceHigh,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: insets.bottom + 16,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.grabber, { backgroundColor: theme.colors.borderStrong }]} />

            <View style={styles.reactionRow}>
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    void react(selected, emoji);
                    setSelected(null);
                  }}
                  style={[styles.reactionButton, { backgroundColor: theme.colors.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityLabel={`React ${emoji}`}
                >
                  <AppText variant="h3">{emoji}</AppText>
                </Pressable>
              ))}
            </View>

            <SheetAction
              icon="arrow-undo-outline"
              label="Reply"
              onPress={() => {
                setReplyTo(replyPreviewFor(selected));
                setSelected(null);
              }}
            />

            {isModerator && (
              <SheetAction
                icon={selected.pinned ? 'remove-circle-outline' : 'pin-outline'}
                label={selected.pinned ? 'Unpin message' : 'Pin message'}
                onPress={() => {
                  void pin(selected.id, !selected.pinned);
                  setSelected(null);
                }}
              />
            )}

            {(selected.authorId === profile?.uid || isModerator) && (
              <SheetAction
                icon="trash-outline"
                label="Delete message"
                destructive
                onPress={() => {
                  void remove(selected.id);
                  setSelected(null);
                }}
              />
            )}
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={19} color={destructive ? theme.colors.loss : theme.colors.textSecondary} />
      <AppText variant="body" color={destructive ? 'loss' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayDivider: { alignItems: 'center', paddingVertical: 10 },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: { paddingTop: 10, paddingHorizontal: 16 },
  grabber: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  reactionButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sheetAction: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
});
