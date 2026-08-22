import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { ProgressBar } from '../ui/Common';
import { useSettingsStore } from '../../store/settingsStore';
import { toast } from '../../store/uiStore';
import { formatDuration } from '../../utils/format';
import { toAppError } from '../../utils/errors';
import {
  uploadCommunityImage,
  uploadCommunityVideo,
  uploadVoiceNote,
  uploadDocument,
} from '../../services/firebase/storageService';
import type { MessageMedia, MessageType, ReplyPreview } from '../../types/models';

export type ComposerProps = {
  uid: string;
  disabled?: boolean;
  disabledReason?: string;
  replyTo: ReplyPreview | null;
  onCancelReply: () => void;
  onSend: (payload: { type: MessageType; text?: string; media?: MessageMedia }) => Promise<boolean>;
};

/**
 * Message composer: text, photo, video, file and voice note.
 *
 * Uploads run before the message document is written, so a message never
 * appears in the room pointing at a half-uploaded file.
 */
export function Composer({
  uid,
  disabled,
  disabledReason,
  replyTo,
  onCancelReply,
  onSend,
}: ComposerProps) {
  const theme = useTheme();
  const haptics = useSettingsStore((s) => s.hapticsEnabled);
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const sendText = useCallback(async () => {
    const value = text.trim();
    if (!value || disabled) return;
    setText('');
    const ok = await onSend({ type: 'text', text: value });
    if (!ok) setText(value);
  }, [disabled, onSend, text]);

  const withUpload = useCallback(
    async (task: (onProgress: (f: number) => void) => Promise<void>) => {
      setUploading(true);
      setProgress(0);
      try {
        await task(setProgress);
      } catch (err) {
        toast.error(toAppError(err).message);
      } finally {
        setUploading(false);
        setProgress(0);
        setAttachOpen(false);
      }
    },
    [],
  );

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const id = `${Date.now()}`;

    await withUpload(async (onProgress) => {
      const url = await uploadCommunityImage(uid, id, asset.uri, onProgress);
      await onSend({
        type: 'image',
        text: text.trim() || undefined,
        media: { url, width: asset.width, height: asset.height, mimeType: asset.mimeType },
      });
      setText('');
    });
  }, [onSend, text, uid, withUpload]);

  const pickVideo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const id = `${Date.now()}`;

    await withUpload(async (onProgress) => {
      const url = await uploadCommunityVideo(uid, id, asset.uri, onProgress);
      await onSend({
        type: 'video',
        media: { url, durationMs: asset.duration ?? undefined, mimeType: asset.mimeType },
      });
    });
  }, [onSend, uid, withUpload]);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const id = `${Date.now()}`;

    await withUpload(async (onProgress) => {
      const url = await uploadDocument(uid, id, asset.uri, asset.name, onProgress);
      await onSend({
        type: 'file',
        media: { url, name: asset.name, sizeBytes: asset.size ?? undefined, mimeType: asset.mimeType },
      });
    });
  }, [onSend, uid, withUpload]);

  const startRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      toast.error('Microphone access is needed to record a voice note.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    if (haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [haptics, recorder]);

  const stopRecording = useCallback(
    async (send: boolean) => {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!send || !uri || durationMs < 800) return;

      const id = `${Date.now()}`;
      await withUpload(async (onProgress) => {
        const url = await uploadVoiceNote(uid, id, uri, onProgress);
        await onSend({ type: 'audio', media: { url, durationMs } });
      });
    },
    [onSend, recorder, recorderState.durationMillis, uid, withUpload],
  );

  if (disabled) {
    return (
      <View
        style={[
          styles.disabled,
          { backgroundColor: theme.colors.surfaceAlt, borderTopColor: theme.colors.border },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={15} color={theme.colors.textTertiary} />
        <AppText variant="bodySm" color="textTertiary">
          {disabledReason ?? 'You cannot post in this community.'}
        </AppText>
      </View>
    );
  }

  if (recorderState.isRecording) {
    return (
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        style={[
          styles.wrap,
          { backgroundColor: theme.colors.bgAlt, borderTopColor: theme.colors.border },
        ]}
      >
        <View style={styles.recording}>
          <View style={[styles.recordDot, { backgroundColor: theme.colors.loss }]} />
          <AppText variant="bodyStrong">{formatDuration(recorderState.durationMillis)}</AppText>
          <AppText variant="caption" color="textTertiary" style={styles.flex}>
            Recording voice note…
          </AppText>
          <Pressable onPress={() => void stopRecording(false)} hitSlop={theme.hitSlop}>
            <Ionicons name="trash-outline" size={21} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => void stopRecording(true)}
            style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="send" size={17} color={theme.colors.onPrimary} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <View
      style={[styles.wrap, { backgroundColor: theme.colors.bgAlt, borderTopColor: theme.colors.border }]}
    >
      {replyTo && (
        <View style={[styles.replyBar, { borderLeftColor: theme.colors.primary }]}>
          <View style={styles.flex}>
            <AppText variant="overline" color="primary">
              Replying to {replyTo.authorName}
            </AppText>
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {replyTo.preview}
            </AppText>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={theme.hitSlop}>
            <Ionicons name="close" size={17} color={theme.colors.textTertiary} />
          </Pressable>
        </View>
      )}

      {uploading && (
        <View style={styles.uploading}>
          <AppText variant="caption" color="textSecondary">
            Uploading… {Math.round(progress * 100)}%
          </AppText>
          <ProgressBar value={progress * 100} height={3} style={{ marginTop: 4 }} />
        </View>
      )}

      {attachOpen && (
        <Animated.View entering={FadeIn.duration(140)} style={styles.attachRow}>
          <AttachButton icon="image-outline" label="Photo" onPress={pickImage} />
          <AttachButton icon="videocam-outline" label="Video" onPress={pickVideo} />
          <AttachButton icon="document-outline" label="File" onPress={pickFile} />
        </Animated.View>
      )}

      <View style={styles.row}>
        <Pressable
          onPress={() => setAttachOpen((v) => !v)}
          hitSlop={theme.hitSlop}
          accessibilityLabel="Attach media"
          accessibilityRole="button"
        >
          <Ionicons
            name={attachOpen ? 'close-circle-outline' : 'add-circle-outline'}
            size={25}
            color={theme.colors.textSecondary}
          />
        </Pressable>

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Message the community…"
            placeholderTextColor={theme.colors.textTertiary}
            selectionColor={theme.colors.primary}
            multiline
            maxLength={4000}
            style={[theme.typography.body, styles.input, { color: theme.colors.textPrimary }]}
          />
        </View>

        {text.trim().length > 0 ? (
          <Pressable
            onPress={sendText}
            disabled={uploading}
            style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Ionicons name="send" size={17} color={theme.colors.onPrimary} />
          </Pressable>
        ) : (
          <Pressable
            onLongPress={startRecording}
            delayLongPress={200}
            style={[styles.sendButton, { backgroundColor: theme.colors.surfaceHigh }]}
            accessibilityLabel="Hold to record a voice note"
            accessibilityRole="button"
          >
            <Ionicons name="mic" size={19} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AttachButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.attachButton,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={19} color={theme.colors.primary} />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputWrap: { flex: 1, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 },
  input: { maxHeight: 110, padding: 0 },
  sendButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 2,
    paddingLeft: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  uploading: { marginBottom: 8 },
  attachRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  attachButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recording: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordDot: { width: 9, height: 9, borderRadius: 5 },
  disabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
