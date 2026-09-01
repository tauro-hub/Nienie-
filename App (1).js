/**
 * ============================================================================
 *  App.js — "Goodnight with Frank" — Offline Sleep App for Severe Insomnia
 * ============================================================================
 *
 *  100% OFFLINE. No network requests, no remote images, no remote fonts.
 *  Frank and every activity prop are built from React Native <View>/<Text>
 *  primitives (rounded rects, circles) with emoji accents as visual accents —
 *  no external image URLs or SVG library required.
 *
 *  ---------------------------------------------------------------------
 *  package.json dependencies (tested against Expo SDK 51):
 *  ---------------------------------------------------------------------
 *  {
 *    "name": "goodnight-with-frank",
 *    "version": "1.0.0",
 *    "main": "node_modules/expo/AppEntry.js",
 *    "dependencies": {
 *      "expo": "~51.0.0",
 *      "expo-av": "~14.0.7",
 *      "react": "18.2.0",
 *      "react-native": "0.74.5"
 *    }
 *  }
 *
 *  ---------------------------------------------------------------------
 *  Required project structure for `eas build` (Android APK / iOS):
 *  ---------------------------------------------------------------------
 *  project-root/
 *   ├── App.js                 <- this file
 *   ├── app.json
 *   ├── eas.json
 *   ├── package.json
 *   └── assets/
 *        ├── marlowemusic-lullaby-580738.mp3              <- Track 1
 *        ├── marlowemusic-lullaby-baby-581505.mp3          <- Track 2
 *        ├── the_mountain-lullaby-lullaby-music-576578.mp3 <- Track 3
 *        │     (all three play back-to-back in this order, then loop —
 *        │      see TRACKS / loadTrack() below. Bundled via require(),
 *        │      so no network is ever needed.)
 *        ├── icon.png          <- app icon (1024x1024)
 *        ├── splash.png        <- splash screen image
 *        └── adaptive-icon.png <- Android adaptive icon foreground
 *
 *  Minimal app.json audio-friendly config reminder (not required in this
 *  file, but needed alongside it):
 *  {
 *    "expo": {
 *      "name": "Goodnight with Frank",
 *      "slug": "goodnight-with-frank",
 *      "assetBundlePatterns": ["**\/*"],
 *      "ios": { "infoPlist": { "UIBackgroundModes": ["audio"] } },
 *      "android": { "package": "com.yourcompany.goodnightwithfrank" }
 *    }
 *  }
 *
 *  Build offline APK locally:  eas build -p android --profile preview --local
 * ============================================================================
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Audio } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = {
  bg: '#0A0E1A',
  moon: '#F4EDE0',
  moonGlow: '#EDE6D6',
  pastelPink: '#F7C6D9',
  pastelLavender: '#C9B6E4',
  pastelBlue: '#A9C7E8',
  pastelMint: '#B7E4C7',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  textPrimary: '#EDEBF5',
  textMuted: '#8D92AE',
  frankBody: '#F5F3EE',
  frankBodyShade: '#E4E0D6',
  frankEar: '#2C2A2E',
  frankPatch: '#2C2A2E',
  frankNoseColor: '#2C2A2E',
};

const rand = (min, max) => Math.random() * (max - min) + min;

/* ===========================================================================
   STARRY BACKGROUND
=========================================================================== */
function Star({ x, y, size, delay }) {
  const opacity = useRef(new Animated.Value(rand(0.2, 0.8))).current;

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: rand(0.15, 0.35),
          duration: rand(1200, 2600),
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: rand(0.7, 1),
          duration: rand(1200, 2600),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => finished && loop());
    };
    loop();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        opacity,
      }}
    />
  );
}

function StarField({ count = 70 }) {
  const stars = useRef(
    Array.from({ length: count }).map(() => ({
      x: rand(0, SCREEN_W),
      y: rand(0, SCREEN_H * 0.72),
      size: rand(1, 3),
      delay: rand(0, 2000),
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </View>
  );
}

/* ===========================================================================
   GLOWING MOON
=========================================================================== */
function Moon() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] });

  return (
    <View style={styles.moonWrap} pointerEvents="none">
      <Animated.View style={[styles.moonGlowLayer, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
      <View style={styles.moonGlowLayerSmall} />
      <View style={styles.moonCore}>
        <View style={styles.moonCrater1} />
        <View style={styles.moonCrater2} />
        <View style={styles.moonCrater3} />
      </View>
    </View>
  );
}

/* ===========================================================================
   FRANK — the sleepy puppy
=========================================================================== */
const ACTIVITIES = {
  bouquet: { key: 'bouquet', label: 'Bouquet', emoji: '🌸' },
  playing: { key: 'playing', label: 'Play', emoji: '🎾' },
  showering: { key: 'showering', label: 'Bath', emoji: '🚿' },
  kisses: { key: 'kisses', label: 'Kisses', emoji: '💋' },
  dancing: { key: 'dancing', label: 'Dancing', emoji: '💃' },
};

// Frank's "talk-back" lines — tap him and he responds, like checking in on
// a virtual companion. Original copy, no third-party character IP.
// Generic pool, used when the current activity has no dedicated lines below.
const FRANK_PHRASES = [
  "You're doing great. Just breathe with me. 🌙",
  'Close your eyes… I\'ll keep watch tonight.',
  'Long day, huh? You\'re safe now.',
  'Shh… let\'s just listen to the music together.',
  'I\'m right here. Try to relax your shoulders.',
  'One more slow breath. In… and out.',
  'You don\'t have to think about anything right now.',
  'Sleepy vibes only. I\'ve got you. 🐾',
  'Let\'s count stars instead of sheep tonight.',
  'You\'re allowed to rest. I\'ll be quiet now.',
];

// Activity-specific lines — makes Frank react to what he's actually doing
// instead of saying the same things regardless of the scene.
const ACTIVITY_PHRASES = {
  bouquet: [
    'These are for you. 🌸',
    'Picked the prettiest ones I could find!',
    'A little something to make you smile.',
  ],
  playing: [
    'Go long! 🎾',
    "Wanna play fetch before bed?",
    "Best. Ball. Ever. Wanna throw it again?",
  ],
  showering: [
    'Squeaky clean and ready for bed!',
    'Careful, don\'t get soap in your eyes 💦',
    'Bath time makes me sleepy too.',
  ],
  kisses: [
    'Mwah! 💋 Right back at you.',
    "You're my favorite person, you know that?",
    'Sweet dreams already starting.',
  ],
  dancing: [
    "Dance it out before bed — doctor's orders! 💃",
    'One more song, then we sleep, promise.',
    'You\'ve got moves. I\'m impressed.',
  ],
};

function Frank({ activity }) {
  const scale = useRef(new Animated.Value(1)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleY = useRef(new Animated.Value(6)).current;
  const [bubbleText, setBubbleText] = useState(null);
  const hideTimeout = useRef(null);
  const lastPhraseIndex = useRef(-1);

  const speak = () => {
    // React to whatever he's currently doing when there are dedicated lines
    // for it; otherwise fall back to the generic bedtime phrases.
    const pool = ACTIVITY_PHRASES[activity] || FRANK_PHRASES;
    // Pick a phrase that isn't the same one twice in a row.
    let idx = Math.floor(Math.random() * pool.length);
    if (idx === lastPhraseIndex.current) {
      idx = (idx + 1) % pool.length;
    }
    lastPhraseIndex.current = idx;
    setBubbleText(pool[idx]);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    bubbleY.setValue(6);
    Animated.parallel([
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(bubbleY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    hideTimeout.current = setTimeout(() => {
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
        setBubbleText(null);
      });
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 30, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 20, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    speak();
  };

  useEffect(() => {
    let anim;
    if (activity === 'dancing' || activity === 'playing') {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(sway, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(sway, { toValue: -1, duration: 420, useNativeDriver: true }),
        ])
      );
      anim.start();
    } else {
      sway.setValue(0);
    }
    return () => anim && anim.stop();
  }, [activity]);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={bounce} style={styles.frankTouchZone}>
      {bubbleText && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.speechBubble,
            { opacity: bubbleOpacity, transform: [{ translateY: bubbleY }] },
          ]}
        >
          <Text style={styles.speechBubbleText}>{bubbleText}</Text>
          <View style={styles.speechBubbleTail} />
        </Animated.View>
      )}
      <Animated.View
        style={[
          styles.frankContainer,
          { transform: [{ scale }, { rotate: activity === 'dancing' || activity === 'playing' ? rotate : '0deg' }] },
        ]}
      >
        <View style={[styles.frankEar, { left: 6, transform: [{ rotate: '-25deg' }] }]} />
        <View style={[styles.frankEar, { right: 6, transform: [{ rotate: '25deg' }] }]} />
        <View style={styles.frankHead}>
          <View style={styles.frankPatch} />
          <View style={[styles.frankCheek, { left: 8 }]} />
          <View style={[styles.frankCheek, { right: 8 }]} />
          <View style={[styles.frankEye, { left: 22 }]} />
          <View style={[styles.frankEye, { left: 46 }]} />
          <View style={styles.frankSnout}>
            <View style={styles.frankNose} />
          </View>
        </View>
        <View style={styles.frankBody} />
        <View style={styles.frankTail} />

        {activity === 'bouquet' && <Text style={styles.accessoryEmoji}>💐</Text>}
        {activity === 'showering' && <View style={styles.bathtub} />}
        {activity === 'kisses' && <Text style={[styles.accessoryEmoji, { fontSize: 22 }]}>💋</Text>}
        {activity === 'dancing' && <Text style={[styles.accessoryEmoji, { fontSize: 20 }]}>🎵</Text>}
        {activity === 'playing' && <Text style={[styles.accessoryEmoji, { fontSize: 22 }]}>🎾</Text>}
      </Animated.View>

      {activity === 'driving' && <Car />}
    </TouchableOpacity>
  );
}

function Car() {
  return (
    <View style={styles.car} pointerEvents="none">
      <View style={styles.carBody} />
      <View style={[styles.carWheel, { left: 10 }]} />
      <View style={[styles.carWheel, { right: 10 }]} />
      <Text style={styles.carHeadlight}>✨</Text>
    </View>
  );
}

/* ===========================================================================
   PARTICLE SYSTEMS
=========================================================================== */
function FloatingParticle({ symbol, startX, size, duration, delay, direction = 'up', color }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration, delay, useNativeDriver: true }).start(
        ({ finished }) => finished && loop()
      );
    };
    loop();
    return () => {
      mounted = false;
    };
  }, []);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: direction === 'up' ? [0, -SCREEN_H * 0.55] : [0, SCREEN_H * 0.4],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, rand(-18, 18), rand(-30, 30)],
  });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rand(90, 360)}deg`] });
  const scale = progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0.4, 1, 1, 0.2] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        bottom: 40,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }, { scale }],
      }}
    >
      {symbol ? (
        <Text style={{ fontSize: size }}>{symbol}</Text>
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      )}
    </Animated.View>
  );
}

function ParticleField({ activity }) {
  const configMap = {
    bouquet: { symbol: '🌸', count: 9, size: [14, 22], duration: [4500, 7500], direction: 'up' },
    kisses: { symbol: '💗', count: 8, size: [14, 24], duration: [4000, 6500], direction: 'up' },
    showering: {
      symbol: null,
      color: 'rgba(210,235,255,0.85)',
      count: 12,
      size: [6, 14],
      duration: [3000, 5200],
      direction: 'up',
    },
    driving: { symbol: null, color: '#EDEBF5', count: 10, size: [2, 4], duration: [900, 1600], direction: 'down' },
    dancing: { symbol: '🎵', count: 6, size: [14, 20], duration: [3000, 5000], direction: 'up' },
    playing: { symbol: '🐾', count: 7, size: [12, 18], duration: [2600, 4200], direction: 'up' },
  };
  const config = configMap[activity] || null;

  // useRef must run on every render regardless of `activity`, so it is called
  // unconditionally (never after an early return) — Rules of Hooks.
  const particles = useRef(
    config
      ? Array.from({ length: config.count }).map((_, i) => ({
          id: i,
          startX: rand(20, SCREEN_W - 40),
          size: rand(config.size[0], config.size[1]),
          duration: rand(config.duration[0], config.duration[1]),
          delay: rand(0, 3000),
        }))
      : []
  ).current;

  if (!config) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <FloatingParticle
          key={p.id}
          symbol={config.symbol}
          color={config.color}
          startX={p.startX}
          size={p.size}
          duration={p.duration}
          delay={p.delay}
          direction={config.direction}
        />
      ))}
    </View>
  );
}

/* ===========================================================================
   ACTIVITY SWITCHER
=========================================================================== */
function ActivitySwitcher({ activity, onChange }) {
  return (
    <View style={styles.switcherRow}>
      {Object.values(ACTIVITIES).map((a) => {
        const active = a.key === activity;
        return (
          <TouchableOpacity
            key={a.key}
            onPress={() => onChange(a.key)}
            style={[styles.switcherBtn, active && styles.switcherBtnActive]}
          >
            <Text style={styles.switcherEmoji}>{a.emoji}</Text>
            <Text style={[styles.switcherLabel, active && styles.switcherLabelActive]}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ===========================================================================
   CUSTOM VOLUME SLIDER (no external native-module dependency)
=========================================================================== */
function VolumeSlider({ value, onChange, width = SCREEN_W - 80 }) {
  const trackWidth = width;
  const knobX = useRef(new Animated.Value(value * trackWidth)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = Math.max(0, Math.min(trackWidth, evt.nativeEvent.locationX));
        knobX.setValue(x);
        onChange(x / trackWidth);
      },
      onPanResponderMove: (evt, gestureState) => {
        const x = Math.max(0, Math.min(trackWidth, gestureState.moveX - 40));
        knobX.setValue(x);
        onChange(x / trackWidth);
      },
    })
  ).current;

  return (
    <View style={styles.sliderWrap} {...panResponder.panHandlers}>
      <View style={[styles.sliderTrack, { width: trackWidth }]}>
        <Animated.View style={[styles.sliderFill, { width: knobX }]} />
      </View>
      <Animated.View style={[styles.sliderKnob, { transform: [{ translateX: knobX }] }]} />
    </View>
  );
}

/* ===========================================================================
   MAIN APP
=========================================================================== */
const PRESETS = [15, 30, 60];

// Playlist — plays in this exact order, then loops back to Track 1.
// Only ever one Audio.Sound instance alive at a time (old one is fully
// unloaded before the next is created) so playback can never overlap.
const TRACKS = [
  { title: 'Marlowe Lullaby', asset: require('./assets/marlowemusic-lullaby-580738.mp3') },
  { title: 'Marlowe Lullaby (Baby)', asset: require('./assets/marlowemusic-lullaby-baby-581505.mp3') },
  { title: 'The Mountain Lullaby', asset: require('./assets/the_mountain-lullaby-lullaby-music-576578.mp3') },
];

export default function App() {
  const [activity, setActivity] = useState('bouquet');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const [trackIndexUI, setTrackIndexUI] = useState(0);

  const soundRef = useRef(null);
  const timerRef = useRef(null);
  const fadeRef = useRef(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const trackIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const mountedRef = useRef(true);

  /* --- Load one playlist track, replacing whatever is currently loaded.
     Guarded by isTransitioningRef so two loads can never race each other
     and no two tracks can ever play at once. --- */
  const loadTrack = useCallback(async (index, autoplay) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    try {
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (!mountedRef.current) return;

      const { sound } = await Audio.Sound.createAsync(TRACKS[index].asset, {
        isLooping: false, // looping is handled at the PLAYLIST level, not per-track
        volume: volumeRef.current,
        shouldPlay: autoplay,
      });

      if (!mountedRef.current) {
        sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      trackIndexRef.current = index;
      setTrackIndexUI(index);

      // When this track ends naturally, auto-advance to the next one —
      // wrapping back to Track 1 after the last track, so the whole
      // playlist loops continuously without ever overlapping.
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          const nextIndex = (trackIndexRef.current + 1) % TRACKS.length;
          loadTrack(nextIndex, true);
        }
      });

      if (autoplay) setIsPlaying(true);
    } catch (err) {
      console.warn('Track failed to load:', err);
    } finally {
      isTransitioningRef.current = false;
    }
  }, []);

  /* --- Set up audio mode and load Track 1 once on mount (offline) --- */
  useEffect(() => {
    mountedRef.current = true;

    async function setup() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        await loadTrack(0, false);
      } catch (err) {
        console.warn('Audio setup failed — check that all three files exist in assets/:', err);
      }
    }

    setup();

    return () => {
      mountedRef.current = false;
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        soundRef.current.unloadAsync();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, [loadTrack]);

  /* --- Play / Pause --- */

  const togglePlay = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.setVolumeAsync(volumeRef.current);
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Playback error:', err);
    }
  }, [isPlaying]);

  /* --- Volume slider change --- */
  const handleVolumeChange = useCallback(
    (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      setVolume(clamped);
      if (soundRef.current && !isFading) {
        soundRef.current.setVolumeAsync(clamped);
      }
    },
    [isFading]
  );

  /* --- 10-second fade-out then pause (called when countdown hits zero) --- */
  const fadeOutAndStop = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || isFading) return;

    setIsFading(true);
    const steps = 20;
    const stepDuration = 10000 / steps;
    const startVolume = volumeRef.current;
    let currentStep = 0;

    fadeRef.current = setInterval(async () => {
      currentStep += 1;
      const nextVolume = Math.max(0, startVolume * (1 - currentStep / steps));
      try {
        await sound.setVolumeAsync(nextVolume);
      } catch (err) {
        /* sound may already be unloaded — ignore */
      }

      if (currentStep >= steps) {
        clearInterval(fadeRef.current);
        try {
          await sound.pauseAsync();
          await sound.setVolumeAsync(startVolume);
        } catch (err) {}
        setIsPlaying(false);
        setIsFading(false);
        setSelectedPreset(null);
        setRemainingSeconds(null);
      }
    }, stepDuration);
  }, [isFading]);

  /* --- Countdown timer: runs once per preset selection --- */
  useEffect(() => {
    if (selectedPreset === null) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          fadeOutAndStop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [selectedPreset, fadeOutAndStop]);

  const startTimer = (minutes) => {
    setSelectedPreset(minutes);
    setRemainingSeconds(minutes * 60);
    if (!isPlaying) togglePlay();
  };

  const cancelTimer = () => {
    clearInterval(timerRef.current);
    setSelectedPreset(null);
    setRemainingSeconds(null);
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.root}>
        <StarField count={70} />
        <Moon />

        <View style={styles.content}>
          <Text style={styles.title}>Goodnight with Frank 🐾</Text>
          <Text style={styles.subtitle}>
            {remainingSeconds !== null ? `Winding down · ${formatTime(remainingSeconds)}` : 'Tap Frank to say hi'}
          </Text>

          <View style={styles.stage}>
            <ParticleField key={activity} activity={activity} />
            <Frank activity={activity} />
          </View>

          <ActivitySwitcher activity={activity} onChange={setActivity} />

          <View style={styles.card}>
            <View style={styles.audioRow}>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
                <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶️'}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.audioLabel}>
                  {isFading ? 'Fading out…' : isPlaying ? 'Now playing' : 'Paused'}
                </Text>
                <Text style={styles.trackLabel} numberOfLines={1}>
                  {TRACKS[trackIndexUI]?.title} · {trackIndexUI + 1} of {TRACKS.length}
                </Text>
              </View>
            </View>
            <VolumeSlider value={volume} onChange={handleVolumeChange} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sleep Timer</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => startTimer(m)}
                  style={[styles.presetBtn, selectedPreset === m && styles.presetBtnActive]}
                >
                  <Text style={[styles.presetText, selectedPreset === m && styles.presetTextActive]}>{m} min</Text>
                </TouchableOpacity>
              ))}
              {selectedPreset !== null && (
                <TouchableOpacity onPress={cancelTimer} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            {remainingSeconds !== null && <Text style={styles.countdown}>{formatTime(remainingSeconds)}</Text>}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ===========================================================================
   STYLES
=========================================================================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },

  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 6 },

  moonWrap: {
    position: 'absolute',
    top: 50,
    right: 30,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonGlowLayer: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.moonGlow },
  moonGlowLayerSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.moonGlow,
    opacity: 0.35,
  },
  moonCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.moon,
    shadowColor: COLORS.moon,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    overflow: 'hidden',
  },
  moonCrater1: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
    top: 12,
    left: 14,
  },
  moonCrater2: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    top: 34,
    left: 40,
  },
  moonCrater3: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    top: 46,
    left: 18,
  },

  stage: { height: SCREEN_H * 0.3, justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 },

  frankTouchZone: { alignItems: 'center', justifyContent: 'flex-end' },
  speechBubble: {
    position: 'absolute',
    top: -54,
    maxWidth: 220,
    backgroundColor: 'rgba(237,235,245,0.96)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 5,
  },
  speechBubbleText: {
    color: '#2A2E3E',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  speechBubbleTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(237,235,245,0.96)',
    transform: [{ rotate: '45deg' }],
  },
  frankContainer: { width: 140, height: 130, alignItems: 'center', justifyContent: 'flex-end' },
  frankEar: {
    position: 'absolute',
    top: 4,
    width: 26,
    height: 40,
    borderRadius: 16,
    backgroundColor: COLORS.frankEar,
  },
  frankHead: {
    width: 74,
    height: 66,
    borderRadius: 34,
    backgroundColor: COLORS.frankBody,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
    zIndex: 2,
    overflow: 'hidden',
  },
  frankPatch: {
    position: 'absolute',
    top: -6,
    left: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.frankPatch,
  },
  frankCheek: {
    position: 'absolute',
    bottom: 14,
    width: 10,
    height: 6,
    borderRadius: 4,
    backgroundColor: COLORS.pastelPink,
    opacity: 0.55,
  },
  frankEye: { position: 'absolute', top: 24, width: 6, height: 6, borderRadius: 3, backgroundColor: '#2C2A2E' },
  frankSnout: {
    position: 'absolute',
    bottom: 6,
    width: 30,
    height: 20,
    borderRadius: 14,
    backgroundColor: COLORS.frankBody,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frankNose: { width: 8, height: 6, borderRadius: 3, backgroundColor: COLORS.frankNoseColor },
  frankBody: { width: 90, height: 58, borderRadius: 30, backgroundColor: COLORS.frankBodyShade, zIndex: 1 },
  frankTail: {
    position: 'absolute',
    right: -6,
    bottom: 30,
    width: 30,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.frankEar,
    transform: [{ rotate: '-20deg' }],
  },
  accessoryEmoji: { position: 'absolute', top: -6, right: -18, fontSize: 26 },
  bathtub: {
    position: 'absolute',
    bottom: -14,
    width: 120,
    height: 26,
    borderRadius: 16,
    backgroundColor: 'rgba(169,199,232,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(169,199,232,0.6)',
  },

  car: { position: 'absolute', bottom: -10, width: 150, height: 40, alignItems: 'center' },
  carBody: { width: 150, height: 26, borderRadius: 14, backgroundColor: COLORS.pastelBlue, opacity: 0.5 },
  carWheel: { position: 'absolute', bottom: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2A2E3E' },
  carHeadlight: { position: 'absolute', right: -4, top: 4, fontSize: 12 },

  switcherRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  switcherBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  switcherBtnActive: { backgroundColor: 'rgba(201,182,228,0.18)', borderColor: COLORS.pastelLavender },
  switcherEmoji: { fontSize: 18 },
  switcherLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  switcherLabelActive: { color: COLORS.pastelLavender },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 10 },

  audioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(247,198,217,0.18)',
    borderWidth: 1,
    borderColor: COLORS.pastelPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playBtnText: { fontSize: 20 },
  audioLabel: { color: COLORS.textMuted, fontSize: 13 },
  trackLabel: { color: COLORS.textPrimary, fontSize: 12, marginTop: 2, opacity: 0.85 },

  sliderWrap: { height: 30, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: COLORS.pastelLavender },
  sliderKnob: {
    position: 'absolute',
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.pastelLavender,
    shadowColor: COLORS.pastelLavender,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },

  presetRow: { flexDirection: 'row', alignItems: 'center' },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  presetBtnActive: { backgroundColor: 'rgba(183,228,199,0.18)', borderColor: COLORS.pastelMint },
  presetText: { color: COLORS.textMuted, fontSize: 13 },
  presetTextActive: { color: COLORS.pastelMint, fontWeight: '600' },
  cancelBtn: { marginLeft: 4 },
  cancelText: { color: '#E89999', fontSize: 12 },

  countdown: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '300', textAlign: 'center', marginTop: 14, letterSpacing: 2 },
});
