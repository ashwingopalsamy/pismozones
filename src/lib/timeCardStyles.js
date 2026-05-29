const GRADIENT_STOPS = [
  { time: 0,  top: [14, 16, 44],    bottom: [24, 18, 54]    },
  { time: 4,  top: [28, 40, 80],    bottom: [52, 18, 6]     },
  { time: 6,  top: [66, 100, 164],  bottom: [240, 146, 20]  },
  { time: 9,  top: [98, 168, 222],  bottom: [165, 194, 224] },
  { time: 12, top: [102, 164, 212], bottom: [135, 180, 220] },
  { time: 17, top: [222, 158, 52],  bottom: [70, 138, 240]  },
  { time: 19, top: [206, 110, 56],  bottom: [46, 42, 116]   },
  { time: 21, top: [26, 22, 70],    bottom: [14, 12, 40]    },
  { time: 24, top: [14, 16, 44],    bottom: [24, 18, 54]    },
];

const srgbToLinear = (value) => {
  const channel = value / 255;
  if (channel <= 0.04045) return channel / 12.92;
  return ((channel + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([r, g, b]) => {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

export function getGradientColors(hour, minute) {
  const timeValue = hour + (minute / 60);

  let i = 0;
  while (i < GRADIENT_STOPS.length - 1 && timeValue >= GRADIENT_STOPS[i + 1].time) i += 1;

  const lower = GRADIENT_STOPS[i];
  const upper = GRADIENT_STOPS[i + 1] || GRADIENT_STOPS[0];
  const range = upper.time - lower.time;
  const t = range > 0 ? (timeValue - lower.time) / range : 0;

  const lerp = (a, b) => a.map((v, index) => Math.round(v + ((b[index] - v) * t)));
  const topColor = lerp(lower.top, upper.top);
  const bottomColor = lerp(lower.bottom, upper.bottom);
  const averageLuminance = (relativeLuminance(topColor) + relativeLuminance(bottomColor)) / 2;
  const contrastOverlay = Math.max(0, Math.min(0.22, (averageLuminance - 0.42) * 0.48));

  return {
    top: `rgb(${topColor.join(',')})`,
    bottom: `rgb(${bottomColor.join(',')})`,
    contrastOverlay,
  };
}

export function computeBorderColors(gradientColors) {
  if (!gradientColors) return {};

  const parse = (rgb) => {
    const m = rgb.match(/\d+/g);
    return m ? m.map(Number) : [128, 128, 128];
  };

  const lighten = ([r, g, b]) =>
    `rgba(${Math.min(255, r + 64)},${Math.min(255, g + 64)},${Math.min(255, b + 64)},0.25)`;

  return {
    '--border-warm': lighten(parse(gradientColors.top)),
    '--border-cool': lighten(parse(gradientColors.bottom)),
  };
}
