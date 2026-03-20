/**
 * HologramLotus.js
 *
 * A holographic lotus flower that shifts rainbow colours in real-time
 * based on iPhone gyroscope tilt data.
 *
 * Dependencies:
 *   expo-sensors          → npx expo install expo-sensors
 *   react-native-svg      → npx expo install react-native-svg
 *   expo-linear-gradient  → npx expo install expo-linear-gradient
 *
 * Usage: drop <HologramLotus /> anywhere in your component tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  G,
  Circle,
} from 'react-native-svg';
import { Gyroscope } from 'expo-sensors';

const { width: SW } = Dimensions.get('window');
const SIZE = SW * 1.35;

// ─── Colour palette matching the reference image ────────────────────────────
// The hologram cycles through: mint-green → sky-blue → lavender → pink → yellow
const HOLO_STOPS = [
  { offset: '0%',   color: '#00ffaa' },  // vivid mint
  { offset: '18%',  color: '#00eeff' },  // vivid cyan
  { offset: '36%',  color: '#4488ff' },  // vivid blue
  { offset: '52%',  color: '#cc44ff' },  // vivid purple
  { offset: '68%',  color: '#ff44cc' },  // vivid pink
  { offset: '82%',  color: '#ffee00' },  // vivid yellow
  { offset: '100%', color: '#00ffaa' },  // vivid mint (loop)
];

// Build an extended palette so we can slice a window into it based on tilt
const EXTENDED = [...HOLO_STOPS, ...HOLO_STOPS, ...HOLO_STOPS];

/**
 * Given a rotation fraction (0‥1), return an array of {offset, color}
 * for 5 gradient stops that form the currently-visible "window" of the rainbow.
 */
function buildStops(fraction) {
  const base = fraction * HOLO_STOPS.length;
  const stops = [];
  for (let i = 0; i < 5; i++) {
    const idx = (Math.floor(base) + i) % HOLO_STOPS.length;
    const next = (idx + 1) % HOLO_STOPS.length;
    const t = base - Math.floor(base);
    stops.push({
      offset: `${i * 25}%`,
      color: lerpColor(HOLO_STOPS[idx].color, HOLO_STOPS[next].color, t),
    });
  }
  return stops;
}

/** Linear interpolation between two hex colours */
function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

// ─── SVG Lotus paths (scaled to 200×130 viewBox) ────────────────────────────
// Centre petals, side petals, and leaves — all with black stroke + gradient fill

// Exact paths traced from the original SVG (viewBox 0 0 272 176)
const PATHS = {
  // Centre petal (main bloom body)
  centrePetal: `M135.617355,141.393692
    C135.007233,130.427429 137.277847,119.897522 140.590698,109.555305
    C141.458160,106.847275 141.300919,104.531418 140.066223,101.927940
    C131.195312,83.222702 118.090080,67.899391 102.442604,54.626076
    C98.283173,51.097744 96.390434,52.116188 95.369667,57.662998
    C92.312477,74.275604 91.423744,91.049034 92.485603,107.847252
    C93.284485,120.485275 94.978333,133.175079 102.661316,143.875061
    C110.221962,154.404694 120.180511,161.147003 133.719254,160.832031
    C138.726486,160.715530 139.561905,159.214279 138.040466,154.507584
    C136.759964,150.546265 135.394760,146.608536 135.617355,141.393692 Z`,

  // Centre top spike (tallest petal, goes to very top)
  centreSpikeLeft: `M128.965927,31.318060
    C125.797554,38.831947 122.704620,46.378944 119.427780,53.845234
    C117.873558,57.386528 118.629494,60.003170 121.252205,62.812210
    C129.799057,71.966286 137.443176,81.826202 143.371658,92.929070
    C143.877579,93.876549 144.219223,95.168831 146.146439,95.121666
    C152.474503,82.985771 160.595749,71.864441 169.969299,61.653008
    C171.502960,59.982254 171.552155,58.245205 170.828156,56.130180
    C165.034622,39.205170 157.345596,23.171215 148.185959,7.836790
    C145.604309,3.514762 144.168808,3.523238 141.520355,7.752907
    C136.923050,15.094925 132.787781,22.699221 128.965927,31.318060 Z`,

  // Right inner petal
  rightInner: `M193.911865,55.871651
    C192.993835,50.625950 190.363388,52.191891 187.762817,54.414326
    C178.491089,62.337902 170.272247,71.264885 163.101547,81.114952
    C149.833328,99.340935 141.899292,119.453011 142.408356,142.319839
    C142.739868,157.211487 153.155746,164.406754 167.161346,159.393112
    C181.263885,154.344757 189.842300,144.026917 193.575958,129.751617
    C199.932816,105.446663 198.293686,81.020515 193.911865,55.871651 Z`,

  // Left inner petal
  leftInner: `M82.741920,38.816341
    C76.306282,35.313511 69.858566,31.838575 63.070564,29.040691
    C57.427963,26.714922 56.014168,27.565411 55.322296,33.539532
    C53.710773,47.454483 53.339279,61.395702 54.357471,75.364166
    C55.733982,94.248405 59.201607,112.624168 68.215012,129.544815
    C74.495239,141.334534 83.045334,150.820084 95.853607,155.758301
    C97.967728,156.573395 100.123009,157.488846 102.391594,156.322845
    C102.544121,154.108124 100.942825,153.160507 99.942223,151.935181
    C95.461441,146.448059 91.962608,140.385651 90.032547,133.597183
    C82.279854,106.329254 83.990883,78.952049 89.728989,51.641010
    C91.297333,44.176373 91.720810,44.265915 85.071312,40.234673
    C84.501793,39.889404 83.939903,39.531532 82.741920,38.816341 Z`,

  // Right outer petal
  // Left leaf (large sweeping leaf)
  leftLeaf: `M4.746345,124.295380
    C1.295554,127.277931 1.775338,130.339142 4.692204,133.307800
    C6.084362,134.724670 7.595157,136.067688 9.217715,137.208847
    C25.659704,148.772583 44.648937,152.840683 64.039597,155.601852
    C69.346161,156.357483 74.700745,157.558487 80.379745,156.365463
    C79.974854,155.573853 79.861160,155.035400 79.529701,154.748978
    C64.522026,141.780594 56.761627,124.715103 51.898655,105.999168
    C50.355507,100.060127 49.802597,99.781044 44.087883,102.252068
    C30.441324,108.152824 17.547852,115.413727 4.746345,124.295380 Z`,

  // Left side ear / small petal on pad
  leftEar: `M28.325991,98.983810
    C29.325804,100.049080 30.502558,100.519295 31.910637,99.908821
    C36.780014,97.797691 41.656277,95.700829 46.493614,93.518082
    C48.724010,92.511658 48.780754,90.426315 48.612442,88.385551
    C48.149452,82.772026 47.465733,77.171478 47.183376,71.550011
    C46.969952,67.300873 44.666794,65.666504 40.830769,65.583000
    C34.524151,65.445694 28.214054,65.294968 21.907778,65.364235
    C15.695529,65.432465 13.726290,68.196754 15.252687,74.394630
    C17.483192,83.451500 22.373817,91.128166 28.325991,98.983810 Z`,

  // Left upper petal overlap
  leftOverlap: `M115.673164,19.860378
    C111.876793,17.172447 108.134102,14.404166 104.267487,11.821386
    C101.033623,9.661260 98.518227,10.439242 97.424736,14.260068
    C95.736870,20.157736 94.233696,26.108206 92.646271,32.034695
    C91.947632,34.642975 92.888802,36.519939 95.089264,37.978374
    C99.934753,41.189896 104.793526,44.387173 109.532936,47.750801
    C112.419495,49.799435 113.821442,49.069405 114.960594,45.878532
    C116.409683,41.819489 118.206825,37.878174 119.978523,33.942192
    C123.668045,25.745602 123.701714,25.760757 115.673164,19.860378 Z`,

  // Right upper petal overlap
  rightOverlap: `M176.512070,18.051289
    C174.511261,19.538225 172.570358,21.115423 170.496246,22.491913
    C166.979645,24.825710 166.434814,27.590578 168.332718,31.378464
    C170.561646,35.827061 172.403412,40.476818 174.272110,45.096355
    C175.628738,48.450085 177.481873,49.537529 180.720230,47.272717
    C185.487137,43.938881 190.317108,40.694221 195.152084,37.459229
    C196.863663,36.314034 197.628586,34.963428 197.066010,32.835903
    C195.454666,26.742100 194.069031,20.586748 192.366928,14.519483
    C191.277939,10.637736 188.841446,9.414039 185.246948,11.894458
    C182.511475,13.782087 179.803329,15.709351 176.512070,18.051289 Z`,

  // Right base decoration
  rightBase: `M216.846512,164.493057
    C214.542938,164.787994 212.240707,165.094101 209.935547,165.375992
    C198.476974,166.777237 187.011017,164.816956 175.555038,165.441193
    C170.522583,165.715424 165.504105,166.246078 160.479279,166.660294
    C160.484802,167.093826 160.490326,167.527374 160.495834,167.960907
    C173.068466,167.999557 185.181839,170.733322 197.223816,173.812775
    C204.069519,175.563416 211.016037,175.997986 217.999771,175.556946
    C223.312714,175.221451 228.617279,174.405594 233.103638,171.153000
    C234.764481,169.948914 236.073807,168.320480 235.409973,166.044693
    C234.723007,163.689545 232.736160,163.416138 230.636276,163.291885
    C226.277054,163.033936 222.035461,164.001450 216.846512,164.493057 Z`,



  // Left base decoration
  leftBase: `M100.575684,171.855118
    C108.768326,169.569260 117.262779,168.833252 125.626694,167.240784
    C121.905212,165.780624 118.144859,165.573608 114.343300,165.396103
    C103.704201,164.899353 93.107628,166.438293 82.432701,165.628738
    C74.640938,165.037827 67.009384,163.014297 59.146915,163.278885
    C57.096020,163.347916 55.040840,163.426010 54.197945,165.765961
    C53.290283,168.285706 54.794350,169.912521 56.568943,171.268585
    C58.996059,173.123322 61.863686,174.016922 64.815865,174.627518
    C76.706429,177.086823 88.280319,175.137665 100.575684,171.855118 Z`,
  // Right leaf (shifted left)
  rightLeaf: `M262.253655,124.295380
    C265.704446,127.277931 265.224662,130.339142 262.307796,133.307800
    C260.915638,134.724670 259.404843,136.067688 257.782285,137.208847
    C241.340296,148.772583 222.351063,152.840683 202.960403,155.601852
    C197.653839,156.357483 192.299255,157.558487 186.620255,156.365463
    C187.025146,155.573853 187.138840,155.035400 187.470299,154.748978
    C202.477974,141.780594 210.238373,124.715103 215.101345,105.999168
    C216.644493,100.060127 217.197403,99.781044 222.912117,102.252068
    C236.558676,108.152824 249.452148,115.413727 262.253655,124.295380 Z`,

  // Right ear (shifted left)
  rightEar: `M238.674009,98.983810
    C237.674196,100.049080 236.497442,100.519295 235.089363,99.908821
    C230.219986,97.797691 225.343723,95.700829 220.506386,93.518082
    C218.275990,92.511658 218.219246,90.426315 218.387558,88.385551
    C218.850548,82.772026 219.534267,77.171478 219.816624,71.550011
    C220.030048,67.300873 222.333206,65.666504 226.169231,65.583000
    C232.475849,65.445694 238.785946,65.294968 245.092222,65.364235
    C251.304471,65.432465 253.273710,68.196754 251.747313,74.394630
    C249.516808,83.451500 244.626183,91.128166 238.674009,98.983810 Z`,
};

// ─── Shimmer overlay positions ───────────────────────────────────────────────
const SHIMMER_CIRCLES = [
  { cx: 136, cy: 80,  r: 22 },
  { cx: 110, cy: 100, r: 14 },
  { cx: 162, cy: 95,  r: 14 },
  { cx: 136, cy: 40,  r: 12 },
  { cx: 80,  cy: 110, r: 10 },
  { cx: 195, cy: 105, r: 10 },
];

// ─── AnimatedSvg wrapper ─────────────────────────────────────────────────────
const AnimatedG = Animated.createAnimatedComponent(G);

export default function HologramLotus() {
  const [gradStops, setGradStops] = useState(buildStops(0));
  const [shimmerStops, setShimmerStops] = useState(buildStops(0.5));

  // Gyroscope accumulator
  const rotAccum = useRef(0);
  const tiltAccum = useRef(0);
  const lastTs = useRef(null);


  // Gyroscope setup
  useEffect(() => {
    Gyroscope.setUpdateInterval(60); // ~16ms

    const subscription = Gyroscope.addListener(({ x, y, z }) => {
      const now = Date.now();
      const dt = lastTs.current ? (now - lastTs.current) / 1000 : 0.016;
      lastTs.current = now;

      // Accumulate rotation from y-axis (left/right tilt) and x-axis (forward/back)
      rotAccum.current  = (rotAccum.current  + y * dt * 0.8) % 1;
      tiltAccum.current = (tiltAccum.current + x * dt * 0.5) % 1;

      // Keep positive
      const rot  = ((rotAccum.current  % 1) + 1) % 1;
      const tilt = ((tiltAccum.current % 1) + 1) % 1;

      setGradStops(buildStops(rot));
      setShimmerStops(buildStops((rot + 0.4) % 1)); // offset shimmer for depth
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <View style={styles.glowRing} />

      {/* Lotus */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={SIZE}
          height={SIZE * 0.645}
          viewBox="0 0 272 176"
        >
          <Defs>
            {/* Main hologram gradient — shifts with gyro */}
            <LinearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              {gradStops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="1" />
              ))}
            </LinearGradient>

            {/* Shimmer overlay — offset hue for iridescent depth */}
            <LinearGradient id="shimmerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              {shimmerStops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="0.45" />
              ))}
            </LinearGradient>

            {/* Radial highlight for each petal centre */}
            <RadialGradient id="petalHighlight" cx="50%" cy="40%" r="60%">
              <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
            </RadialGradient>

            {/* Dark base for leaves */}
            <LinearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              {gradStops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="0.75" />
              ))}
            </LinearGradient>
          </Defs>

          <G transform="translate(-9, 0)">
          {/* ── Leaves / base decorations (back layer) ── */}
          <Path d={PATHS.leftLeaf}   fill="url(#leafGrad)"  />
          <Path d={PATHS.leftEar}    fill="url(#leafGrad)"  />
          <Path d={PATHS.leftBase}   fill="url(#leafGrad)"  />
          <Path d={PATHS.rightBase}  fill="url(#leafGrad)"  />
          {/* Shimmer on leaves */}
          <Path d={PATHS.leftLeaf}   fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.leftEar}    fill="url(#shimmerGrad)" opacity="0.35" />
          <Path d={PATHS.rightLeaf}  fill="url(#leafGrad)"  />
          <Path d={PATHS.rightEar}   fill="url(#leafGrad)"  />
          <Path d={PATHS.rightLeaf}  fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.rightEar}   fill="url(#shimmerGrad)" opacity="0.35" />
          <Path d={PATHS.leftBase}   fill="url(#shimmerGrad)" opacity="0.35" />
          <Path d={PATHS.rightBase}  fill="url(#shimmerGrad)" opacity="0.35" />

          {/* ── Outer petals ── */}

          {/* ── Inner side petals ── */}
          <Path d={PATHS.leftInner}     fill="url(#holoGrad)"      strokeLinejoin="round" />
          <Path d={PATHS.rightInner}    fill="url(#holoGrad)"      strokeLinejoin="round" />
          <Path d={PATHS.leftInner}     fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.rightInner}    fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.leftInner}     fill="url(#petalHighlight)" />
          <Path d={PATHS.rightInner}    fill="url(#petalHighlight)" />

          {/* ── Centre bloom body ── */}
          <Path d={PATHS.centrePetal}   fill="url(#holoGrad)"    />
          <Path d={PATHS.centrePetal}   fill="url(#shimmerGrad)" opacity="0.45" />
          <Path d={PATHS.centrePetal}   fill="url(#petalHighlight)" />

          {/* ── Upper petal overlaps (left/right of spike) ── */}
          <Path d={PATHS.leftOverlap}   fill="url(#holoGrad)"    />
          <Path d={PATHS.rightOverlap}  fill="url(#holoGrad)"    />
          <Path d={PATHS.leftOverlap}   fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.rightOverlap}  fill="url(#shimmerGrad)" opacity="0.4" />
          <Path d={PATHS.leftOverlap}   fill="url(#petalHighlight)" />
          <Path d={PATHS.rightOverlap}  fill="url(#petalHighlight)" />

          {/* ── Centre top spike (tallest, frontmost) ── */}
          <Path d={PATHS.centreSpikeLeft} fill="url(#holoGrad)"    />
          <Path d={PATHS.centreSpikeLeft} fill="url(#shimmerGrad)" opacity="0.45" />
          <Path d={PATHS.centreSpikeLeft} fill="url(#petalHighlight)" />

          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  glowRing: {
    position: 'absolute',
    width:  SIZE * 0.85,
    height: SIZE * 0.55,
    borderRadius: SIZE * 0.4,
    backgroundColor: 'transparent',
  },
});