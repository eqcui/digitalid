/**
 * tor.js
 * ------
 * Single source of truth for the Tor daemon instance.
 * Both App.js and api.js import from here — no circular dependency.
 */

import TorBridgeFactory from 'react-native-tor';

const tor = TorBridgeFactory({
  stopDaemonOnBackground: true,
  startDaemonOnActive:    true,
});

export default tor;