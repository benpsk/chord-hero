import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect the root route to the tabs group (home screen)
  return <Redirect href={'/(tabs)' as any} />;
}
