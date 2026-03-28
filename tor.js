/**
 * tor.js
 * ------
 * Single source of truth for the Tor daemon instance.
 *
 * IMPORTANT: TorBridgeFactory must NOT be called at module load time.
 * The React Native native bridge is not ready when JS modules are first
 * evaluated during bundling. Only call getTor() from inside a useEffect
 * or component lifecycle — never at the top level of a module.
 */

import TorBridgeFactory from 'react-native-tor';

let _tor = null;

export function getTor() {
  if (!_tor) {
    try {
      _tor = TorBridgeFactory({
        stopDaemonOnBackground: true,
        startDaemonOnActive:    true,
      });
    } catch (e) {
      console.warn('[tor.js] TorBridgeFactory threw:', e);
      _tor = null;
    }
  }
  return _tor;
}

export function resetTor() {
  _tor = null;
}