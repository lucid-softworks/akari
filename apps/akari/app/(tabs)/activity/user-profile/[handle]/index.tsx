import { useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/ProfileView';

export default function UserProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  if (!handle) {
    return null;
  }

  return <ProfileView handle={handle} />;
}
