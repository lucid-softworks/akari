import { useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/ProfileView';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  if (!handle) {
    return null;
  }

  return <ProfileView handle={handle} />;
}
