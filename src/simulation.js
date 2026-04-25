import { create } from "zustand";

export const SPEED_MODES = {
  1: { name: "Subsonic", maxVelocity: 0.001, thrustMultiplier: 1 },
  2: { name: "High Velocity", maxVelocity: 0.01, thrustMultiplier: 2 },
  3: { name: "Orbital Escape", maxVelocity: 0.05, thrustMultiplier: 5 },
  4: { name: "Relativistic", maxVelocity: 0.2, thrustMultiplier: 15 },
  5: { name: "Ultra-Relativistic", maxVelocity: 0.5, thrustMultiplier: 30 },
  6: { name: "Light Speed", maxVelocity: 0.9999, thrustMultiplier: 50 },
};

export const ORBIT_DAYS_PER_SECOND = 8;
const EARTH_RADIUS_KM = 6371;
const EARTH_SCENE_RADIUS = 1;
const DEG_TO_RAD = Math.PI / 180;

export const CELESTIAL_BODIES = [
  { id: "sun", name: "Sun", radius: 696340, distanceFromSun: 0, orbitalPeriod: 0, orbitalInclination: 0, orbitalEccentricity: 0, axialTilt: 7.25, color: "#fdb813", type: "star", initialAngle: 0, summary: "The Sun is the star at the center of our Solar System. It produces the light and heat that make life on Earth possible through nuclear fusion in its core.", history: "People have watched and worshipped the Sun since prehistory. Modern science showed in the 19th and 20th centuries that it is a star powered by fusion rather than fire." },
  { id: "mercury", name: "Mercury", radius: 2439.7, distanceFromSun: 57.9, orbitalPeriod: 88, orbitalInclination: 7, orbitalEccentricity: 0.206, longitudeOfAscendingNode: 48.3, axialTilt: 0.034, color: "#a3a3a3", type: "planet", initialAngle: 0.8, summary: "Mercury is the smallest planet and the closest one to the Sun. It has a heavily cratered rocky surface and almost no atmosphere to hold heat.", history: "Mercury was known to ancient skywatchers, but detailed views only came with space missions like Mariner 10 in the 1970s and MESSENGER in the 2000s." },
  { id: "venus", name: "Venus", radius: 6051.8, distanceFromSun: 108.2, orbitalPeriod: 224.7, orbitalInclination: 3.4, orbitalEccentricity: 0.007, longitudeOfAscendingNode: 76.7, axialTilt: 177.4, color: "#dfbf67", type: "planet", initialAngle: 2.4, summary: "Venus is similar to Earth in size, but its thick carbon-dioxide atmosphere traps extreme heat. Its clouds hide a harsh volcanic world below.", history: "Venus has been known since antiquity as the morning and evening star. Radar mapping and Soviet Venera landers revealed its surface in the 20th century." },
  { id: "earth", name: "Earth", radius: 6371, distanceFromSun: 149.6, orbitalPeriod: 365.25, orbitalInclination: 0, orbitalEccentricity: 0.0167, longitudeOfAscendingNode: 0, axialTilt: 23.44, color: "#5f8de8", type: "planet", initialAngle: 0, summary: "Earth is the only known world with stable liquid water on its surface and confirmed life. Its oceans, atmosphere, and magnetic field help protect and shape that life.", history: "For most of human history Earth was treated as the center of everything. The scientific revolution changed that, placing Earth as one planet orbiting the Sun." },
  { id: "moon", name: "Moon", radius: 1737.4, distanceFromSun: 149.6, distanceFromParent: 0.384, orbitalPeriod: 27.3, orbitalInclination: 5.1, orbitalEccentricity: 0.055, longitudeOfAscendingNode: 125.1, axialTilt: 6.7, color: "#d1d5db", type: "moon", parentId: "earth", initialAngle: 1.2, summary: "The Moon is Earth's natural satellite. It strongly affects ocean tides and has preserved a record of impacts because it has no weather to erase them.", history: "The Moon has been observed throughout human history, but the biggest milestone came in 1969 when Apollo 11 landed the first humans on its surface." },
  { id: "mars", name: "Mars", radius: 3389.5, distanceFromSun: 228, orbitalPeriod: 687, orbitalInclination: 1.8, orbitalEccentricity: 0.094, longitudeOfAscendingNode: 49.6, axialTilt: 25.2, color: "#c94f27", type: "planet", initialAngle: 3.8, summary: "Mars is a cold rocky planet known for its red color, giant volcanoes, and evidence that liquid water once flowed on its surface.", history: "Mars inspired centuries of speculation about life. Robotic missions in the modern era replaced myth with evidence of an ancient wetter environment." },
  { id: "jupiter", name: "Jupiter", radius: 69911, distanceFromSun: 778.5, orbitalPeriod: 4331, orbitalInclination: 1.3, orbitalEccentricity: 0.049, longitudeOfAscendingNode: 100.5, axialTilt: 3.1, color: "#ceb78a", type: "planet", initialAngle: 4.5, summary: "Jupiter is the largest planet in the Solar System. It is a gas giant with powerful storms, strong gravity, and dozens of moons.", history: "Galileo's observation of four large Jovian moons in 1610 was one of the key discoveries that supported the idea that not everything orbits Earth." },
  { id: "saturn", name: "Saturn", radius: 58232, distanceFromSun: 1432, orbitalPeriod: 10747, orbitalInclination: 2.5, orbitalEccentricity: 0.052, longitudeOfAscendingNode: 113.7, axialTilt: 26.7, color: "#ead5a0", type: "planet", initialAngle: 5.2, summary: "Saturn is a gas giant famous for its bright ring system made of countless particles of ice and rock. It is less dense than water on average.", history: "Saturn was known to ancient astronomers, but telescopes revealed its rings. The Cassini mission transformed our understanding of Saturn and its moons." },
  { id: "uranus", name: "Uranus", radius: 25362, distanceFromSun: 2867, orbitalPeriod: 30589, orbitalInclination: 0.8, orbitalEccentricity: 0.047, longitudeOfAscendingNode: 74, axialTilt: 97.8, color: "#b9d6de", type: "planet", initialAngle: 1.8, summary: "Uranus is an ice giant with a blue-green color from methane in its atmosphere. It rotates tipped far over on its side compared with other planets.", history: "Uranus became the first planet discovered with a telescope when William Herschel identified it in 1781, expanding the known Solar System." },
  { id: "neptune", name: "Neptune", radius: 24622, distanceFromSun: 4515, orbitalPeriod: 59800, orbitalInclination: 1.8, orbitalEccentricity: 0.01, longitudeOfAscendingNode: 131.8, axialTilt: 28.3, color: "#5664eb", type: "planet", initialAngle: 5.9, summary: "Neptune is a distant ice giant with deep blue color, fast winds, and a dynamic atmosphere. It receives little sunlight but still shows active weather.", history: "Neptune was discovered in 1846 after astronomers predicted its location from gravitational effects on Uranus, a major success for mathematical physics." },
  { id: "blackhole", name: "Cygnus X-1", radius: 22000000, distanceFromSun: 100000, orbitalPeriod: 0, color: "#000000", type: "blackhole", initialAngle: Math.PI, summary: "Cygnus X-1 is modeled here as a black hole: an object so dense that not even light can escape once it crosses the event horizon. In this simulation it also acts like a wormhole trigger.", history: "Cygnus X-1 became famous in the 20th century as one of the first strong black hole candidates, helping move black holes from theory into observed astronomy." },
];

export function getScaledDistance(distance) {
  if (distance === 0) {
    return 0;
  }
  const innerDistance = 8 + 15 * Math.log10(Math.min(distance, 500));
  if (distance <= 500) {
    return innerDistance;
  }
  return innerDistance + Math.pow(distance - 500, 0.38) * 4;
}

export function getScaledRadius(radius, type) {
  if (type === "star") {
    return 5.4;
  }
  if (type === "blackhole") {
    return 2.15;
  }
  const ratio = radius / EARTH_RADIUS_KM;
  const minimum = type === "moon" ? 0.2 : 0.3;
  return Math.max(minimum, EARTH_SCENE_RADIUS * Math.pow(ratio, 0.72));
}

export function getScaledSatelliteDistance(distanceMillionKm = 0.384, parentRadius = EARTH_SCENE_RADIUS) {
  return parentRadius + Math.max(0.8, Math.log10(1 + distanceMillionKm * 1000) * 0.36);
}

function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 5; i += 1) {
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

export function getOrbitalPosition(body, elapsedSeconds = 0, center = { x: 0, y: 0, z: 0 }, orbitDistance = null) {
  if (!body.orbitalPeriod || body.orbitalPeriod <= 0) {
    return center;
  }

  const semiMajorAxis = orbitDistance ?? getScaledDistance(body.distanceFromSun);
  const eccentricity = body.orbitalEccentricity ?? 0;
  const meanAnomaly = (body.initialAngle ?? 0) + ((elapsedSeconds * ORBIT_DAYS_PER_SECOND * Math.PI * 2) / body.orbitalPeriod);
  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const xOrbit = semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const zOrbit = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly);
  const node = (body.longitudeOfAscendingNode ?? 0) * DEG_TO_RAD;
  const inclination = (body.orbitalInclination ?? 0) * DEG_TO_RAD;
  const xNode = xOrbit * Math.cos(node) - zOrbit * Math.sin(node);
  const zNode = xOrbit * Math.sin(node) + zOrbit * Math.cos(node);

  return {
    x: center.x + xNode,
    y: center.y + zNode * Math.sin(inclination),
    z: center.z + zNode * Math.cos(inclination),
  };
}

export function getBlackHoleScenePosition() {
  const blackHole = CELESTIAL_BODIES.find((body) => body.type === "blackhole");
  if (!blackHole) {
    return { x: 0, y: 0, z: 0 };
  }
  const angle = blackHole.initialAngle ?? 0;
  const navigationDistance = 18 * (8 + 15 * Math.log10(blackHole.distanceFromSun));
  return {
    x: Math.cos(angle) * navigationDistance,
    y: 0,
    z: Math.sin(angle) * navigationDistance,
  };
}

const DEFAULT_POSITION = { x: 0, y: 5, z: 50 };
const DEFAULT_VELOCITY = { x: 0, y: 0, z: 0 };

export const useSimulationStore = create((set, get) => ({
  shipPosition: DEFAULT_POSITION,
  shipVelocity: DEFAULT_VELOCITY,
  speedMode: 1,
  velocityFraction: 0,
  earthTime: 0,
  shipTime: 0,
  isPaused: false,
  cameraMode: "follow",
  selectedBody: null,
  isInWormhole: false,
  wormholeExitPosition: null,
  fps: 60,
  setShipPosition: (shipPosition) => set({ shipPosition }),
  setShipVelocity: (shipVelocity) => set({ shipVelocity }),
  setSpeedMode: (speedMode) => set({ speedMode }),
  setVelocityFraction: (velocityFraction) => set({ velocityFraction: Math.min(velocityFraction, 0.9999) }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setSelectedBody: (selectedBody) => set({ selectedBody }),
  setFps: (fps) => set({ fps }),
  updateTime: (delta) => {
    const { velocityFraction, earthTime, shipTime, isPaused } = get();
    if (isPaused) {
      return;
    }
    const gammaFactor = Math.sqrt(Math.max(0, 1 - velocityFraction * velocityFraction));
    set({
      earthTime: earthTime + delta,
      shipTime: shipTime + delta * gammaFactor,
    });
  },
  triggerWormhole: () => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + 20 * Math.random();
    set({
      isInWormhole: true,
      wormholeExitPosition: {
        x: Math.cos(angle) * radius,
        y: (Math.random() - 0.5) * 10,
        z: Math.sin(angle) * radius,
      },
    });
  },
  completeWormhole: () => {
    const { wormholeExitPosition } = get();
    if (!wormholeExitPosition) {
      return;
    }
    set({
      shipPosition: wormholeExitPosition,
      isInWormhole: false,
      wormholeExitPosition: null,
      velocityFraction: 0,
      shipVelocity: DEFAULT_VELOCITY,
    });
  },
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  returnToSolarSystem: () =>
    set({
      shipPosition: DEFAULT_POSITION,
      shipVelocity: DEFAULT_VELOCITY,
      velocityFraction: 0,
      isInWormhole: false,
      wormholeExitPosition: null,
    }),
  reset: () =>
    set({
      shipPosition: DEFAULT_POSITION,
      shipVelocity: DEFAULT_VELOCITY,
      speedMode: 1,
      velocityFraction: 0,
      earthTime: 0,
      shipTime: 0,
      isPaused: false,
      cameraMode: "follow",
      selectedBody: null,
      isInWormhole: false,
      wormholeExitPosition: null,
      fps: 60,
    }),
}));
