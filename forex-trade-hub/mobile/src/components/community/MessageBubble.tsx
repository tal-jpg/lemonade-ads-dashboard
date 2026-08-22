import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/Avatar';
import { timeOfDay } from '../../utils/date';
import { formatDuration, formatFileSize } from '../../utils/format';
import type { Message } from '../../types/models';

export type MessageBubbleProps = {
  message: Message;
  isMine: boolean;
  /** True when the previous message is from the same author within a few minutes. */
  grouped: boolean;
  onLongPress: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  onOpenMedia: (message: Message) => void;
  myUid: string;
};

/**
 * A chat message.
 *
 * Memoised on the fields that actually affect rendering — a busy room re-renders
 * only the bubbles that changed, which is what keeps scrolling smooth.
 */
export const MessageBubble = memo(
  function MessageBubble({
    message,
    isMine,
    grouped,
    onLongPress,
    onReact,
    onOpenMedia,
    myUid,
  }: MessageBubbleProps) {
    const theme = useTheme();

    if (message.type === 'system') {
      return (
        <View style={styles.system}>
          <AppText variant="caption" color="textTertiary" center>
            {message.text}
          </AppText>
        </View>
      );
    }

    if (message.deleted) {
      return (
        <View style={[styles.container, isMine && styles.mine]}>
          <View
            style={[
              styles.bubble,
              styles.deleted,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
            ]}
          >
            <Ionicons name="ban-outline" size={13} color={theme.colors.textTertiary} />
            <AppText variant="bodySm" color="textTertiary">
              This message was removed
            </AppText>
          </View>
        </View>
      );
    }

    const isStaff = message.authorRole === 'admin' || message.authorRole === 'moderator';
    const reactionEntries = Object.entries(message.reactions).filter(([, uids]) => uids.length > 0);

    return (
      <View style={[styles.container, isMine && styles.mine, grouped && styles.grouped]}>
        {!isMine && (
          <View style={styles.avatarSlot}>
            {!grouped && (
              <Avatar
                name={message.authorName}
                uri={message.authorPhoto}
                size={30}
                ring={message.authorPlan === 'premium'}
              />
            )}
          </View>
        )}

        <Pressable
          onLongPress={() => onLongPress(message)}
          delayLongPress={280}
          accessibilityRole="button"
          accessibilityLabel={`Message from ${message.authorName}`}
          style={[
            styles.bubble,
            {
              backgroundColor: isMine ? theme.colors.primaryMuted : theme.colors.surface,
              borderColor: isMine ? 'transparent' : theme.colors.border,
              borderWidth: isMine ? 0 : StyleSheet.hairlineWidth,
              borderRadius: theme.radius.md,
              borderBottomRightRadius: isMine ? 4 : theme.radius.md,
              borderBottomLeftRadius: isMine ? theme.radius.md : 4,
              padding: message.type === 'image' ? 4 : theme.spacing.md,
            },
          ]}
        >
          {!isMine && !grouped && (
            <View style={styles.authorRow}>
              <AppText variant="captionStrong" tint={isStaff ? theme.colors.primary : theme.colors.secondary}>
                {message.authorName}
              </AppText>
              {message.authorRole === 'admin' && (
                <Ionicons name="shield-checkmark" size={11} color={theme.colors.primary} />
              )}
              {message.authorPlan === 'premium' && (
                <Ionicons name="star" size={10} color={theme.colors.premium} />
              )}
            </View>
          )}

          {message.replyTo && (
            <View
              style={[
                styles.reply,
                {
                  borderLeftColor: theme.colors.primary,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: theme.radius.xs,
                },
              ]}
            >
              <AppText variant="overline" color="primary">
                {message.replyTo.authorName}
              </AppText>
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {message.replyTo.preview}
              </AppText>
            </View>
          )}

          {message.forwarded && (
            <View style={styles.forwarded}>
              <Ionicons name="arrow-redo-outline" size={11} color={theme.colors.textTertiary} />
              <AppText variant="overline" color="textTertiary">
                Forwarded
              </AppText>
            </View>
          )}

          {message.type === 'image' && message.media && (
            <Pressable onPress={() => onOpenMedia(message)}>
              <Image
                source={{ uri: message.media.url }}
                style={[styles.image, { borderRadius: theme.radius.sm }]}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
              />
            </Pressable>
          )}

          {message.type === 'video' && message.media && (
            <Pressable onPress={() => onOpenMedia(message)} style={styles.videoWrap}>
              <View style={[styles.image, styles.videoPlaceholder, { backgroundColor: theme.colors.surfaceHigh, borderRadius: theme.radius.sm }]}>
                <Ionicons name="play-circle" size={40} color={theme.colors.textPrimary} />
              </View>
            </Pressable>
          )}

          {message.type === 'audio' && message.media && (
            <Pressable onPress={() => onOpenMedia(message)} style={styles.audio}>
              <View style={[styles.audioButton, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="play" size={14} color={theme.colors.onPrimary} />
              </View>
              <View style={styles.waveform}>
                {(message.media.waveform?.length
                  ? message.media.waveform
                  : Array.from({ length: 22 }, (_, i) => 0.35 + ((i * 7) % 10) / 18)
                )
                  .slice(0, 26)
                  .map((amp, i) => (
                    <View
                      key={i}
                      style={{
                        width: 2.5,
                        height: Math.max(4, Math.min(1, amp) * 22),
                        borderRadius: 2,
                        backgroundColor: theme.colors.textTertiary,
                      }}
                    />
                  ))}
              </View>
              <AppText variant="mono" color="textSecondary">
                {formatDuration(message.media.durationMs)}
              </AppText>
            </Pressable>
          )}

          {message.type === 'file' && message.media && (
            <Pressable onPress={() => onOpenMedia(message)} style={styles.file}>
              <View style={[styles.fileIcon, { backgroundColor: theme.colors.surfaceHigh, borderRadius: theme.radius.xs }]}>
                <Ionicons name="document-outline" size={18} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodySm" numberOfLines={1}>
                  {message.media.name ?? 'Attachment'}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {formatFileSize(message.media.sizeBytes)}
                </AppText>
              </View>
            </Pressable>
          )}

          {message.text ? (
            <AppText
              variant="body"
              style={message.type === 'image' ? { paddingHorizontal: 8, paddingTop: 6 } : undefined}
            >
              {message.text}
            </AppText>
          ) : null}

          <View style={[styles.timeRow, message.type === 'image' && styles.timeRowInset]}>
            {message.editedAt && (
              <AppText variant="caption" color="textTertiary">
                edited
              </AppText>
            )}
            <AppText variant="caption" color="textTertiary">
              {timeOfDay(message.createdAt)}
            </AppText>
            {message.pinned && <Ionicons name="pin" size={11} color={theme.colors.warning} />}
          </View>

          {reactionEntries.length > 0 && (
            <View style={styles.reactions}>
              {reactionEntries.map(([emoji, uids]) => {
                const mine = uids.includes(myUid);
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => onReact(message, emoji)}
                    style={[
                      styles.reaction,
                      {
                        backgroundColor: mine ? theme.colors.primaryMuted : theme.colors.surfaceHigh,
                        borderColor: mine ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <AppText variant="caption">{emoji}</AppText>
                    <AppText variant="caption" color={mine ? 'primary' : 'textSecondary'}>
                      {uids.length}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Pressable>
      </View>
    );
  },
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.deleted === next.message.deleted &&
    prev.message.pinned === next.message.pinned &&
    prev.message.editedAt === next.message.editedAt &&
    prev.grouped === next.grouped &&
    JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions),
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexDirection: 'row', gap: 8, marginBottom: 10, paddingHorizontal: 4 },
  grouped: { marginBottom: 3 },
  mine: { justifyContent: 'flex-end' },
  avatarSlot: { width: 30 },
  bubble: { maxWidth: '82%', minWidth: 88 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  reply: { borderLeftWidth: 2, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6 },
  forwarded: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  image: { width: 220, height: 165 },
  videoWrap: { position: 'relative' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
  audioButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 190 },
  fileIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 3 },
  timeRowInset: { paddingHorizontal: 8, paddingBottom: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleted: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  system: { alignItems: 'center', paddingVertical: 10 },
});
