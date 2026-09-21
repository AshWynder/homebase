import { Redirect } from 'expo-router';

/** Entry route: send owners into their primary tab (MVP). */
export default function Index() {
  return <Redirect href="/(owner)/properties" />;
}