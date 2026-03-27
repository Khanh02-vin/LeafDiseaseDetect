import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Suppress known warnings that don't affect functionality
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text>',
]);

// Ignore all LogBox warnings in production
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
