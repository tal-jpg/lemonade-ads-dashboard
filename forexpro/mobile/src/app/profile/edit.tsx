import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StackHeader } from '../../components/ui/StackHeader';
import { ProgressBar } from '../../components/ui/Common';
import { useAuthStore } from '../../store/authStore';
import { updateProfileFields, updatePhone, fetchPhone } from '../../services/firebase/userRepo';
import { uploadAvatar } from '../../services/firebase/storageService';
import { validateBio, validateFullName, validatePhone } from '../../utils/validate';
import { toAppError } from '../../utils/errors';
import { toast } from '../../store/uiStore';

export default function EditProfile() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(profile?.address?.city ?? '');
  const [country, setCountry] = useState(profile?.address?.country ?? '');
  const [line1, setLine1] = useState(profile?.address?.line1 ?? '');

  const [errors, setErrors] = useState<{ fullName?: string; bio?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // The phone number lives in the owner-only private subcollection.
  useEffect(() => {
    if (!profile) return;
    void fetchPhone(profile.uid).then(setPhone);
  }, [profile]);

  if (!profile) return null;

  const changePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo access is needed to change your picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadAvatar(profile.uid, result.assets[0].uri, setUploadProgress);
      await updateProfileFields(profile.uid, { photoURL: url });
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(toAppError(err).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const save = async () => {
    const next = {
      fullName: validateFullName(fullName) ?? undefined,
      bio: validateBio(bio) ?? undefined,
      phone: validatePhone(phone, false) ?? undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      await updateProfileFields(profile.uid, {
        fullName: fullName.trim(),
        bio: bio.trim(),
        address: { line1: line1.trim(), city: city.trim(), country: country.trim() },
      });
      if (phone.trim()) await updatePhone(profile.uid, phone.trim());
      toast.success('Profile saved');
      router.back();
    } catch (err) {
      toast.error(toAppError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Edit profile" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarBlock}>
            <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Change profile picture">
              <Avatar name={profile.fullName} uri={profile.photoURL} size={96} />
              <View
                style={[
                  styles.cameraBadge,
                  { backgroundColor: theme.colors.primary, borderColor: theme.colors.bg },
                ]}
              >
                <Ionicons name="camera" size={14} color={theme.colors.onPrimary} />
              </View>
            </Pressable>
            <AppText variant="captionStrong" color="primary" style={{ marginTop: 10 }}>
              Change photo
            </AppText>
            {uploading && (
              <ProgressBar value={uploadProgress * 100} height={3} style={{ marginTop: 10, width: 140 }} />
            )}
          </View>

          <View style={{ gap: theme.spacing.base, marginTop: theme.spacing.xl }}>
            <Input
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              icon="person-outline"
            />

            <Input
              label="Username"
              value={`@${profile.username}`}
              editable={false}
              icon="at-outline"
              helper="Usernames cannot be changed."
            />

            <Input
              label="Email"
              value={profile.email}
              editable={false}
              icon="mail-outline"
              helper="Contact support to change your email."
            />

            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              icon="call-outline"
              keyboardType="phone-pad"
              placeholder="+1 555 000 1234"
            />

            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              error={errors.bio}
              multiline
              maxLength={200}
              placeholder="Swing trader focused on major pairs and gold."
              helper={`${bio.length}/200`}
            />

            <AppText variant="overline" color="textTertiary" style={{ marginTop: theme.spacing.sm }}>
              Address
            </AppText>

            <Input label="Street" value={line1} onChangeText={setLine1} icon="home-outline" placeholder="Optional" />
            <Input label="City" value={city} onChangeText={setCity} icon="business-outline" placeholder="Optional" />
            <Input label="Country" value={country} onChangeText={setCountry} icon="earth-outline" placeholder="Optional" />

            <Button label="Save changes" loading={saving} onPress={save} style={{ marginTop: theme.spacing.sm }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  avatarBlock: { alignItems: 'center', marginTop: 8 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
});
