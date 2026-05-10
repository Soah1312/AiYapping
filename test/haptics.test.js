import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticStreaming,
  vibrate
} from '../src/lib/haptics.js';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

const setWindow = (value) => {
  Object.defineProperty(globalThis, 'window', {
    value,
    configurable: true,
    writable: true
  });
};

const setNavigator = (value) => {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true
  });
};

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    delete globalThis.window;
  }
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    delete globalThis.navigator;
  }
});

test('vibrate calls navigator.vibrate when available', () => {
  let calledWith;
  setWindow({});
  setNavigator({
    vibrate: (pattern) => {
      calledWith = pattern;
    }
  });

  vibrate(20);

  assert.equal(calledWith, 20);
});

test('haptic helpers call vibrate with expected patterns', () => {
  const patterns = [];
  setWindow({});
  setNavigator({
    vibrate: (pattern) => {
      patterns.push(pattern);
    }
  });

  hapticLight();
  hapticMedium();
  hapticHeavy();
  hapticStreaming();

  assert.deepEqual(patterns, [10, 20, 30, [5, 5]]);
});

test('vibrate is a no-op when window is undefined', () => {
  setWindow(undefined);
  if (originalNavigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
  } else {
    delete globalThis.navigator;
  }

  assert.doesNotThrow(() => {
    hapticLight();
  });
});
