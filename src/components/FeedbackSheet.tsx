import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, font, useTheme, useThemedStyles } from '../theme/ThemeContext';
import { appVersion, openPrivacy } from '../utils/beta';
import { Button, Icon, IconButton, IconName, Notice, sheetStyles } from './ui';

export type FeedbackCategory = 'BUG' | 'IDEA' | 'CONFUSING' | 'PRAISE' | 'OTHER';

const CATEGORIES: { value: FeedbackCategory; label: string; icon: IconName }[] = [
  { value: 'BUG', label: 'Bug', icon: 'bug-outline' },
  { value: 'IDEA', label: 'Idea', icon: 'lightbulb-on-outline' },
  { value: 'CONFUSING', label: 'Confusing', icon: 'help-circle-outline' },
  { value: 'PRAISE', label: 'Praise', icon: 'heart-outline' },
  { value: 'OTHER', label: 'Other', icon: 'dots-horizontal-circle-outline' },
];
const MIN = 3;
const MAX = 2000;
const RATING_WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Great'];

/** Without this the browser draws its own focus ring around the textarea in the web preview. */
const WEB_NO_OUTLINE = { outlineStyle: 'none' } as object;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Route name of the screen the sheet was opened from. */
  page?: string;
  preset?: { category?: FeedbackCategory; message?: string };
}

/** Beta feedback form (POST /feedback). Rendered once by BetaProvider. */
export const FeedbackSheet: React.FC<Props> = ({ visible, onClose, page, preset }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sheet = useThemedStyles(sheetStyles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ text: string; rateLimited: boolean } | null>(null);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setCategory(preset?.category ?? null);
    setRating(0);
    setMessage(preset?.message ?? '');
    setContactOk(false);
    setError(null);
    setSent(false);
  }, [visible, preset]);

  const length = message.trim().length;
  const canSend = length >= MIN && length <= MAX && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const res = await fetchApi('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        source: 'MOBILE',
        category: category ?? 'OTHER',
        ...(rating ? { rating } : {}),
        message: message.trim(),
        ...(page ? { page } : {}),
        appVersion: appVersion(),
        contactOk: !!user && contactOk,
      }),
    });
    setSending(false);
    if (res.success) {
      setSent(true);
    } else {
      const rateLimited = res.error?.code === 'RATE_LIMITED';
      setError({
        rateLimited,
        text: rateLimited
          ? res.error?.message || 'You have sent a lot of feedback this hour — please try again later.'
          : res.error?.details?.[0]?.message || res.error?.message || 'Could not send your feedback. Please try again.',
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={sheet.overlay} onPress={onClose} accessibilityLabel="Close feedback">
          <Pressable style={[sheet.sheet, styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={sheet.handle} />
            <View style={sheet.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={sheet.title} accessibilityRole="header">{sent ? 'Feedback sent' : 'Send feedback'}</Text>
                {!sent && <Text style={styles.sub}>Becho is in beta — tell us what works and what doesn't.</Text>}
              </View>
              <IconButton name="close" label="Close" onPress={onClose} />
            </View>

            {sent ? (
              <View style={styles.done}>
                <View style={styles.doneIcon}>
                  <Icon name="check-circle-outline" size={34} color={colors.success} />
                </View>
                <Text style={styles.doneTitle}>Thank you!</Text>
                <Text style={styles.doneBody}>Your feedback went straight to the Becho team.{user && contactOk ? ' We may get in touch about it.' : ''}</Text>
                <View style={styles.doneActions}>
                  <Button title="Send more" variant="soft" onPress={() => { setSent(false); setMessage(''); setRating(0); setCategory(null); }} style={{ flex: 1 }} />
                  <Button title="Done" onPress={onClose} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                <Text style={styles.label}>What's it about?</Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {CATEGORIES.map((c) => {
                    const on = category === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setCategory(on ? null : c.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={c.label}
                      >
                        <Icon name={c.icon} size={16} color={on ? colors.onChipSelected : colors.textSecondary} />
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.label}>How is Becho so far? <Text style={styles.optional}>(optional)</Text></Text>
                  {rating ? <Text style={styles.ratingWord}>{RATING_WORDS[rating]}</Text> : null}
                </View>
                <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${rating ? `${rating} of 5` : 'not set'}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setRating(rating === n ? 0 : n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                      accessibilityState={{ selected: rating >= n }}
                      hitSlop={4}
                      style={styles.star}
                    >
                      <Icon name={rating >= n ? 'star' : 'star-outline'} size={30} color={rating >= n ? '#F59E0B' : colors.borderStrong} />
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.label}>Your message</Text>
                  <Text style={[styles.counter, length > MAX && { color: colors.danger }]}>{message.length} / {MAX}</Text>
                </View>
                <TextInput
                  style={[styles.input, focused && styles.inputFocused, Platform.OS === 'web' && WEB_NO_OUTLINE]}
                  value={message}
                  onChangeText={(t) => { setMessage(t); setError(null); }}
                  placeholder={category === 'BUG' ? 'What happened? What did you expect instead?' : 'Tell us what you think…'}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  maxLength={MAX}
                  textAlignVertical="top"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  accessibilityLabel="Your message"
                  accessibilityHint={`At least ${MIN} characters`}
                />

                {user ? (
                  <TouchableOpacity
                    style={styles.contact}
                    onPress={() => setContactOk((v) => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: contactOk }}
                  >
                    <View style={[styles.checkbox, contactOk && styles.checkboxOn]}>
                      {contactOk && <Icon name="check" size={14} color={colors.onPrimary} />}
                    </View>
                    <Text style={styles.contactText}>You can contact me about this</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.meta}>You're not signed in, so this is sent anonymously.</Text>
                )}

                {error ? (
                  <Notice
                    tone={error.rateLimited ? 'warning' : 'danger'}
                    icon={error.rateLimited ? 'timer-sand' : 'alert-circle-outline'}
                    title={error.rateLimited ? 'Slow down a little' : 'Not sent'}
                    style={{ marginTop: 12 }}
                  >
                    {error.text}
                  </Notice>
                ) : null}

                <Button title="Send feedback" icon="send-outline" onPress={send} loading={sending} disabled={!canSend} style={{ marginTop: 16 }} />
                <Text style={styles.meta}>
                  We include the screen ({page ?? 'unknown'}) and app version ({appVersion()}).{' '}
                  <Text style={styles.link} onPress={() => void openPrivacy()} accessibilityRole="link">Privacy notice</Text>
                </Text>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    sheet: { width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '92%' },
    sub: { fontFamily: font.regular, fontSize: 13, color: c.textMuted, marginTop: 2 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    label: { fontFamily: font.semibold, fontSize: 14, color: c.text, marginBottom: 8 },
    optional: { fontFamily: font.regular, color: c.textMuted },
    ratingWord: { fontFamily: font.semibold, fontSize: 12, color: c.primaryText, marginBottom: 8 },
    counter: { fontFamily: font.semibold, fontSize: 11, color: c.textMuted, marginBottom: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
    chipOn: { backgroundColor: c.chipSelected, borderColor: c.chipSelected },
    chipText: { fontFamily: font.medium, fontSize: 13, color: c.text },
    chipTextOn: { color: c.onChipSelected, fontFamily: font.semibold },
    stars: { flexDirection: 'row', gap: 6 },
    star: { padding: 2 },
    input: { minHeight: 120, maxHeight: 200, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: c.text },
    inputFocused: { borderColor: c.primary },
    contact: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: c.primary, borderColor: c.primary },
    contactText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: c.text },
    meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: 12 },
    link: { fontFamily: font.semibold, color: c.primaryText },
    done: { alignItems: 'center', paddingVertical: 12, gap: 8 },
    doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.successSoft, borderWidth: 1, borderColor: c.successSoftBorder, alignItems: 'center', justifyContent: 'center' },
    doneTitle: { fontFamily: font.heading, fontSize: 18, color: c.text, marginTop: 4 },
    doneBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center' },
    doneActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  });
