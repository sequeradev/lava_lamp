import './style.css';

type QualityLevel = 1 | 2 | 3;

const QUALITY: QualityLevel = 2;
const BASE_ORANGE = '#ff7a24';
const CORE_EMISSION = 0.26;
const EDGE_GLOW_INTENSITY = 1.42;
const EDGE_GLOW_RADIUS = 1.25;

type LavaConfig = {
  blobCount: number;
  speed: number;
  blobRadiusMin: number;
  blobRadiusMax: number;
  threshold: number;
  glowStrength: number;
  edgeSoftness: number;
  thicknessStrength: number;
  translucency: number;
  absorption: number;
  coreShadow: number;
  coreEmission: number;
  edgeGlowIntensity: number;
  edgeGlowRadius: number;
  orangeColorA: string;
  orangeColorB: string;
  backgroundColor: string;
};

type QualityPreset = {
  dprCap: number;
  fbmOctaves: number;
  warpStrength: number;
  normalEps: number;
  ditherStrength: number;
  glowFalloff: number;
};

const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  1: {
    dprCap: 1.25,
    fbmOctaves: 4,
    warpStrength: 0.26,
    normalEps: 0.028,
    ditherStrength: 0.0012,
    glowFalloff: 6.2,
  },
  2: {
    dprCap: 2.0,
    fbmOctaves: 5,
    warpStrength: 0.32,
    normalEps: 0.02,
    ditherStrength: 0.00095,
    glowFalloff: 7.8,
  },
  3: {
    dprCap: 2.0,
    fbmOctaves: 6,
    warpStrength: 0.36,
    normalEps: 0.015,
    ditherStrength: 0.0008,
    glowFalloff: 9.2,
  },
};

const config: LavaConfig = {
  blobCount: 9,
  speed: 0.06,
  blobRadiusMin: 0.23,
  blobRadiusMax: 0.46,
  threshold: 3.05,
  glowStrength: 0.64,
  edgeSoftness: 0.4,
  thicknessStrength: 1.65,
  translucency: 0.72,
  absorption: 1.35,
  coreShadow: 1.2,
  coreEmission: CORE_EMISSION,
  edgeGlowIntensity: EDGE_GLOW_INTENSITY,
  edgeGlowRadius: EDGE_GLOW_RADIUS,
  orangeColorA: BASE_ORANGE,
  orangeColorB: '#eb4a16',
  backgroundColor: '#050508',
};

const quality = QUALITY_PRESETS[QUALITY];
const MAX_BLOBS = 12;

const vertexSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision highp float;

#define MAX_BLOBS 12
#define FBM_OCTAVES ${quality.fbmOctaves}

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_aspect;
uniform int u_blobCount;
uniform vec2 u_blobCenters[MAX_BLOBS];
uniform float u_blobRadii[MAX_BLOBS];
uniform float u_threshold;
uniform float u_glowStrength;
uniform float u_edgeSoftness;
uniform float u_warpStrength;
uniform float u_normalEps;
uniform float u_ditherStrength;
uniform float u_thicknessStrength;
uniform float u_translucency;
uniform float u_absorption;
uniform float u_coreShadow;
uniform float u_glowFalloff;
uniform float u_coreEmission;
uniform float u_edgeGlowIntensity;
uniform float u_edgeGlowRadius;
uniform vec3 u_orangeA;
uniform vec3 u_orangeB;
uniform vec3 u_background;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;

  for (int i = 0; i < FBM_OCTAVES; i++) {
    value += amp * noise(p);
    p = p * 2.03 + vec2(17.0, 11.0);
    amp *= 0.5;
  }

  return value;
}

float fieldAt(vec2 p) {
  vec2 warp = vec2(
    fbm(p * 0.82 + vec2(0.0, u_time * 0.024)),
    fbm(p * 0.82 + vec2(4.6, -u_time * 0.021))
  );
  vec2 warped = p + (warp - 0.5) * u_warpStrength;

  float field = 0.0;
  for (int i = 0; i < MAX_BLOBS; i++) {
    if (i >= u_blobCount) {
      break;
    }

    vec2 center = vec2(u_blobCenters[i].x * u_aspect, u_blobCenters[i].y);
    vec2 delta = warped - center;
    float radius = u_blobRadii[i];
    field += (radius * radius) / (dot(delta, delta) + 0.03);
  }

  return field;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_aspect;

  float field = fieldAt(p);

  float eps = u_normalEps;
  float gx = fieldAt(p + vec2(eps, 0.0)) - fieldAt(p - vec2(eps, 0.0));
  float gy = fieldAt(p + vec2(0.0, eps)) - fieldAt(p - vec2(0.0, eps));
  vec2 grad = vec2(gx, gy);
  float gradLen = max(length(grad), 0.0001);

  // Approximate signed distance in field space for smooth transitions and thickness.
  float signedToSurface = (field - u_threshold) / gradLen;
  float mask = smoothstep(-u_edgeSoftness, u_edgeSoftness, signedToSurface);

  float inside = max(signedToSurface, 0.0);
  float thickness = 1.0 - exp(-inside * u_thicknessStrength);

  vec3 normal = normalize(vec3(grad, gradLen * 0.45 + 0.4));
  vec3 lightDir = normalize(vec3(-0.42, 0.33, 0.84));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  float diffuse = max(dot(normal, lightDir), 0.0);
  float backScatter = pow(max(dot(-lightDir, normal), 0.0), 1.8) * thickness;
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);

  vec3 reflected = reflect(-lightDir, normal);
  float specular = pow(max(dot(reflected, viewDir), 0.0), 24.0);

  float innerNoise = fbm(p * 1.55 + vec2(u_time * 0.017, -u_time * 0.014));
  float toneMix = clamp(0.16 + innerNoise * 0.86 + thickness * 0.22, 0.0, 1.0);
  vec3 waxBase = mix(u_orangeA, u_orangeB, toneMix);

  float absorb = exp(-thickness * u_absorption);
  float core = smoothstep(0.1, 0.95, inside * u_coreShadow);
  float coreDarkening = mix(1.0, 0.58, core);

  vec3 wax = waxBase * (0.36 + diffuse * 0.66) * absorb * coreDarkening;
  wax += waxBase * backScatter * u_translucency * vec3(1.16, 0.88, 0.56);
  wax += mix(u_orangeA, u_orangeB, 0.25) * thickness * thickness * u_translucency * 0.6;
  wax += specular * vec3(1.0, 0.78, 0.5) * 0.13;
  wax += fresnel * vec3(0.18, 0.07, 0.02) * 0.22;

  // Temperature ramp: hotter core shifts toward bright yellow-orange.
  vec3 edgeColor = vec3(0.88, 0.22, 0.08);
  vec3 midColor = mix(u_orangeA, u_orangeB, 0.35);
  vec3 coreColor = vec3(1.0, 0.47, 0.15);
  float heat = clamp(thickness * 0.75 + core * 0.6 + smoothstep(0.0, 2.0, field - u_threshold) * 0.3, 0.0, 1.0);
  vec3 heatGradient = mix(edgeColor, midColor, smoothstep(0.02, 0.55, heat));
  heatGradient = mix(heatGradient, coreColor, smoothstep(0.52, 1.0, heat));

  // Emissive hot core driven by thickness + field intensity.
  float fieldBoost = smoothstep(0.0, 2.4, field - u_threshold);
  float coreEmissionMask = pow(clamp(heat, 0.0, 1.0), 1.35);
  vec3 emission = heatGradient * (0.22 + thickness * 0.95 + fieldBoost * 0.35) * coreEmissionMask;
  emission *= u_coreEmission;
  emission = min(emission, vec3(0.28, 0.16, 0.07));
  wax += emission;

  float edgeDistance = abs(signedToSurface);
  float glowFalloff = u_glowFalloff / max(u_edgeGlowRadius, 0.01);
  float edgeBand = exp(-edgeDistance * (glowFalloff * 0.52));
  float outerHalo = exp(-edgeDistance * (glowFalloff * 0.2));
  float curvature = clamp(gradLen * 0.22, 0.0, 1.0);
  vec3 glowColor = mix(midColor, coreColor, 0.4);
  vec3 glow = glowColor * (edgeBand * (0.38 + curvature * 0.62) + outerHalo * 0.24);
  glow *= u_glowStrength * u_edgeGlowIntensity;

  float vignette = smoothstep(1.55, 0.25, length(p));
  vec3 background = u_background + vec3(0.012, 0.006, 0.002) * vignette;

  vec3 color = mix(background, wax, mask);
  float outsideMask = 1.0 - mask;
  vec3 spill = glow * outsideMask * 1.2;
  color += glow * (0.35 + 0.25 * mask);
  color += spill;

  // Mild HDR-like curve for luminous highlights while staying soft.
  color = pow(max(color, 0.0), vec3(0.9));

  // Very subtle filmic dithering to break 8-bit gradient banding.
  float dither = hash(gl_FragCoord.xy + vec2(13.1, 7.7) * fract(u_time * 0.17)) - 0.5;
  color += dither * u_ditherStrength;

  gl_FragColor = vec4(color, 1.0);
}
`;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('Root container #app was not found.');
}

const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
app.appendChild(canvas);

const glContext = canvas.getContext('webgl', {
  alpha: false,
  antialias: true,
  depth: false,
  preserveDrawingBuffer: false,
});

if (!glContext) {
  throw new Error('WebGL is not supported in this browser.');
}

const gl = glContext;

function compileShader(type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader object.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create shader program.');
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertex);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragment);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.';
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

function getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    throw new Error(`Uniform not found: ${name}`);
  }
  return location;
}

function hexToVec3(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) {
    throw new Error(`Expected a 6-digit hex color, got: ${hex}`);
  }

  const value = Number.parseInt(cleaned, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

const program = createProgram(vertexSource, fragmentSource);
gl.useProgram(program);

const positionLocation = gl.getAttribLocation(program, 'a_position');
if (positionLocation === -1) {
  throw new Error('Attribute not found: a_position');
}

const resolutionLocation = getUniformLocation(program, 'u_resolution');
const timeLocation = getUniformLocation(program, 'u_time');
const aspectLocation = getUniformLocation(program, 'u_aspect');
const blobCountLocation = getUniformLocation(program, 'u_blobCount');
const blobCentersLocation = getUniformLocation(program, 'u_blobCenters');
const blobRadiiLocation = getUniformLocation(program, 'u_blobRadii');
const thresholdLocation = getUniformLocation(program, 'u_threshold');
const glowStrengthLocation = getUniformLocation(program, 'u_glowStrength');
const edgeSoftnessLocation = getUniformLocation(program, 'u_edgeSoftness');
const warpStrengthLocation = getUniformLocation(program, 'u_warpStrength');
const normalEpsLocation = getUniformLocation(program, 'u_normalEps');
const ditherStrengthLocation = getUniformLocation(program, 'u_ditherStrength');
const thicknessStrengthLocation = getUniformLocation(program, 'u_thicknessStrength');
const translucencyLocation = getUniformLocation(program, 'u_translucency');
const absorptionLocation = getUniformLocation(program, 'u_absorption');
const coreShadowLocation = getUniformLocation(program, 'u_coreShadow');
const glowFalloffLocation = getUniformLocation(program, 'u_glowFalloff');
const coreEmissionLocation = getUniformLocation(program, 'u_coreEmission');
const edgeGlowIntensityLocation = getUniformLocation(program, 'u_edgeGlowIntensity');
const edgeGlowRadiusLocation = getUniformLocation(program, 'u_edgeGlowRadius');
const orangeALocation = getUniformLocation(program, 'u_orangeA');
const orangeBLocation = getUniformLocation(program, 'u_orangeB');
const backgroundLocation = getUniformLocation(program, 'u_background');

const quad = gl.createBuffer();
if (!quad) {
  throw new Error('Failed to create vertex buffer.');
}

gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,
    3, -1,
    -1, 3,
  ]),
  gl.STATIC_DRAW,
);

gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.uniform1f(thresholdLocation, config.threshold);
gl.uniform1f(glowStrengthLocation, config.glowStrength);
gl.uniform1f(edgeSoftnessLocation, config.edgeSoftness);
gl.uniform1f(warpStrengthLocation, quality.warpStrength);
gl.uniform1f(normalEpsLocation, quality.normalEps);
gl.uniform1f(ditherStrengthLocation, quality.ditherStrength);
gl.uniform1f(thicknessStrengthLocation, config.thicknessStrength);
gl.uniform1f(translucencyLocation, config.translucency);
gl.uniform1f(absorptionLocation, config.absorption);
gl.uniform1f(coreShadowLocation, config.coreShadow);
gl.uniform1f(glowFalloffLocation, quality.glowFalloff);
gl.uniform1f(coreEmissionLocation, config.coreEmission);
gl.uniform1f(edgeGlowIntensityLocation, config.edgeGlowIntensity);
gl.uniform1f(edgeGlowRadiusLocation, config.edgeGlowRadius);
gl.uniform3fv(orangeALocation, hexToVec3(config.orangeColorA));
gl.uniform3fv(orangeBLocation, hexToVec3(config.orangeColorB));
gl.uniform3fv(backgroundLocation, hexToVec3(config.backgroundColor));

const centers = new Float32Array(MAX_BLOBS * 2);
const radii = new Float32Array(MAX_BLOBS);
const phases = new Float32Array(MAX_BLOBS);
const xFreqs = new Float32Array(MAX_BLOBS);
const yFreqs = new Float32Array(MAX_BLOBS);
const radiusFreqs = new Float32Array(MAX_BLOBS);

for (let i = 0; i < MAX_BLOBS; i += 1) {
  const seed = i + 1;
  phases[i] = seed * 1.618;
  xFreqs[i] = 0.35 + ((seed * 37) % 29) / 220;
  yFreqs[i] = 0.3 + ((seed * 53) % 31) / 240;
  radiusFreqs[i] = 0.18 + ((seed * 71) % 19) / 170;
}

let width = 1;
let height = 1;
let aspect = 1;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);
  const clientWidth = Math.max(1, Math.floor(window.innerWidth));
  const clientHeight = Math.max(1, Math.floor(window.innerHeight));

  width = Math.max(1, Math.floor(clientWidth * dpr));
  height = Math.max(1, Math.floor(clientHeight * dpr));
  aspect = width / height;

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${clientWidth}px`;
  canvas.style.height = `${clientHeight}px`;

  gl.viewport(0, 0, width, height);
  gl.uniform2f(resolutionLocation, width, height);
  gl.uniform1f(aspectLocation, aspect);
}

window.addEventListener('resize', resize);
resize();

const start = performance.now();

function tick(now: number): void {
  const t = ((now - start) * 0.001) * config.speed;

  for (let i = 0; i < MAX_BLOBS; i += 1) {
    const idx = i * 2;
    if (i >= config.blobCount) {
      centers[idx] = 0;
      centers[idx + 1] = 0;
      radii[i] = 0.0001;
      continue;
    }

    const phase = phases[i];
    const xPrimary = Math.sin(t * xFreqs[i] + phase);
    const xSecondary = Math.sin(t * (xFreqs[i] * 0.53) + phase * 1.72);
    const yPrimary = Math.cos(t * yFreqs[i] + phase * 1.37);
    const ySecondary = Math.sin(t * (yFreqs[i] * 0.46) + phase * 2.11);
    const buoyancy = Math.sin(t * 0.22 + phase * 0.83);

    centers[idx] = (xPrimary * 0.7 + xSecondary * 0.35) * 0.85;
    centers[idx + 1] = (yPrimary * 0.62 + ySecondary * 0.31 + buoyancy * 0.22) * 0.85;

    const pulse = 0.5 + 0.5 * Math.sin(t * radiusFreqs[i] + phase * 0.64);
    radii[i] = config.blobRadiusMin + (config.blobRadiusMax - config.blobRadiusMin) * pulse;
  }

  gl.uniform1f(timeLocation, t);
  gl.uniform1i(blobCountLocation, Math.min(config.blobCount, MAX_BLOBS));
  gl.uniform2fv(blobCentersLocation, centers);
  gl.uniform1fv(blobRadiiLocation, radii);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
