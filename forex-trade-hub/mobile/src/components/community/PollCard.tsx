import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { optionPct } from '../../services/firebase/pollRepo';
import { daysUntil } from '../../utils/date';
import type { Poll } from '../../types/models';

const TYPE_LABEL: Record<Poll['type'], string> = {
  daily: 'Daily poll',
  weekly: 'Weekly poll',
  trading: 'Trading poll',
  multi: 'Community poll',
};

/**
 * Community poll.
 *
 * Results stay hidden until the member votes — seeing the tally first biases
 * the answer. Duplicate voting is impossible: the vote document id is the uid
 * and the rules forbid updating it.
 */
export function PollCard({
  poll,
  myVote,
  voting,
  onVote,
}: {
  poll: Poll;
  myVote: string[] | null;
  voting: boolean;
  onVote: (optionIds: string[]) => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const hasVoted = myVote !== null;
  const expired = poll.expiresAt !== undefined && poll.expiresAt < Date.now();
  const locked = hasVoted || expired || !poll.isActive;

  const toggle = (optionId: string) => {
    if (locked) return;
    setSelected((prev) => {
      if (poll.allowMultiple) {
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      }
      return [optionId];
    });
  };

  return (
    <Card variant="surface">
      <View style={styles.header}>
        <Badge label={TYPE_LABEL[poll.type]} tone="info" icon="bar-chart-outline" />
        {poll.expiresAt && !expired && (
          <AppText variant="caption" color="textTertiary">
            {daysUntil(poll.expiresAt)}d left
          </AppText>
        )}
        {expired && <Badge label="Closed" tone="neutral" />}
      </View>

      <AppText variant="title" style={{ marginTop: theme.spacing.sm }}>
        {poll.question}
      </AppText>
      {poll.description && (
        <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }}>
          {poll.description}
        </AppText>
      )}

      <View style={{ marginTop: theme.spacing.base, gap: 8 }}>
        {poll.options.map((option) => {
          const pct = optionPct(option.votes, poll.totalVotes);
          const isMine = myVote?.includes(option.id) ?? false;
          const isSelected = selected.includes(option.id);

          return (
            <Pressable
              key={option.id}
              onPress={() => toggle(option.id)}
              disabled={locked}
              accessibilityRole="radio"
              accessibilityState={{ checked: isMine || isSelected, disabled: locked }}
              style={[
                styles.option,
                {
                  borderColor: isMine || isSelected ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.surfaceAlt,
                },
              ]}
            >
              {/* Result bar sits behind the label once the member has voted. */}
              {locked && (
                <View
                  style={[
                    styles.resultBar,
                    {
                      width: `${pct}%`,
                      backgroundColor: isMine ? theme.colors.primaryMuted : theme.colors.surfaceHigh,
                    },
                  ]}
                />
              )}

              <View style={styles.optionRow}>
                {!locked && (
                  <Ionicons
                    name={
                      isSelected
                        ? poll.allowMultiple
                          ? 'checkbox'
                          : 'radio-button-on'
                        : poll.allowMultiple
                          ? 'square-outline'
                          : 'radio-button-off'
                    }
                    size={17}
                    color={isSelected ? theme.colors.primary : theme.colors.textTertiary}
                  />
                )}
                {locked && isMine && (
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                )}
                <AppText variant="bodySm" style={styles.flex} numberOfLines={2}>
                  {option.label}
                </AppText>
                {locked && (
                  <AppText variant="captionStrong" color={isMine ? 'primary' : 'textSecondary'}>
                    {pct}%
                  </AppText>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {!locked && (
        <Button
          label={poll.allowMultiple ? 'Submit votes' : 'Vote'}
          size="sm"
          loading={voting}
          disabled={selected.length === 0}
          style={{ marginTop: theme.spacing.md }}
          onPress={() => onVote(selected)}
        />
      )}

      <AppText variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
        {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
        {hasVoted ? ' · You voted' : ''}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  option: { borderWidth: 1, overflow: 'hidden' },
  resultBar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
});
