import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  CELESTIAL_BODIES,
  SPEED_MODES,
  getBlackHoleScenePosition,
  getScaledDistance,
  getScaledRadius,
  useSimulationStore,
} from "./simulation";

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function HudPanel({ className = "", children }) {
  return <div className={`hud-panel ${className}`}>{children}</div>;
}

function SceneBackground() {
  const { scene } = useThree();

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    context.fillStyle = "#03050b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 5000; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 1.6;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255,255,255,${Math.random()})`;
      context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    return () => texture.dispose();
  }, [scene]);

  return null;
}

function PlanetBody({ body }) {
  const meshRef = useRef(null);
  const orbitRef = useRef(body.initialAngle ?? 0);
  const radius = getScaledRadius(body.radius, body.type);
  const distance = getScaledDistance(body.distanceFromSun);

  const orbitPoints = useMemo(() => {
    if (body.distanceFromSun === 0 || body.type === "moon") {
      return null;
    }
    const points = [];
    for (let step = 0; step <= 256; step += 1) {
      const angle = (step / 256) * Math.PI * 2;
      points.push([Math.cos(angle) * distance, 0, Math.sin(angle) * distance]);
    }
    return points;
  }, [body.distanceFromSun, body.type, distance]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    if (body.orbitalPeriod === 0) {
      meshRef.current.rotation.y += 0.002;
      return;
    }

    const speed = (2 * Math.PI) / (10 * body.orbitalPeriod);
    const angle = orbitRef.current + clock.getElapsedTime() * speed;

    if (body.type === "moon" && body.parentId) {
      const parent = CELESTIAL_BODIES.find((item) => item.id === body.parentId);
      if (parent) {
        const parentDistance = getScaledDistance(parent.distanceFromSun);
        const parentAngle = (parent.initialAngle ?? 0) + clock.getElapsedTime() * ((2 * Math.PI) / (10 * parent.orbitalPeriod));
        meshRef.current.position.set(
          Math.cos(parentAngle) * parentDistance + 1.2 * Math.cos(angle * 10),
          0,
          Math.sin(parentAngle) * parentDistance + 1.2 * Math.sin(angle * 10),
        );
      }
    } else {
      meshRef.current.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    }
    meshRef.current.rotation.y += 0.004;
  });

  const position = body.distanceFromSun > 0 ? [Math.cos(orbitRef.current) * distance, 0, Math.sin(orbitRef.current) * distance] : [0, 0, 0];

  return (
    <group>
      {orbitPoints ? <Line points={orbitPoints} color="#415063" lineWidth={1} transparent opacity={0.35} /> : null}
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[radius, 64, 64]} />
        {body.type === "star" ? (
          <meshBasicMaterial color={body.color} />
        ) : (
          <meshStandardMaterial color={body.color} emissive={body.id === "earth" ? "#17358d" : body.color} emissiveIntensity={body.id === "earth" ? 0.12 : 0.05} roughness={0.75} metalness={0.08} />
        )}
      </mesh>
      {body.type === "star" ? (
        <>
          <pointLight position={[0, 0, 0]} color="#fff5e0" intensity={3} distance={220} decay={1} />
          <mesh><sphereGeometry args={[radius * 1.12, 32, 32]} /><meshBasicMaterial color="#ffd96a" transparent opacity={0.3} /></mesh>
          <mesh><sphereGeometry args={[radius * 1.32, 32, 32]} /><meshBasicMaterial color="#ff9c37" transparent opacity={0.16} /></mesh>
        </>
      ) : null}
      {body.id === "saturn" ? (
        <mesh position={position} rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[radius * 1.4, radius * 2.1, 128]} />
          <meshStandardMaterial color="#d8c6a2" side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      ) : null}
      {body.id === "uranus" ? (
        <mesh position={position} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <ringGeometry args={[radius * 1.5, radius * 2, 64]} />
          <meshStandardMaterial color="#8ea5aa" side={THREE.DoubleSide} transparent opacity={0.25} />
        </mesh>
      ) : null}
    </group>
  );
}

function AsteroidBelt({ innerDistance, outerDistance, count, color, geometry = "dodecahedron" }) {
  const meshRef = useRef(null);
  const transforms = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: innerDistance + Math.random() * (outerDistance - innerDistance),
        y: (Math.random() - 0.5) * 4,
        scale: 0.02 + Math.random() * 0.08,
      })),
    [count, innerDistance, outerDistance],
  );

  useEffect(() => {
    if (!meshRef.current) {
      return;
    }
    const matrix = new THREE.Matrix4();
    transforms.forEach((item, index) => {
      matrix.compose(new THREE.Vector3(Math.cos(item.angle) * item.radius, item.y, Math.sin(item.angle) * item.radius), new THREE.Quaternion(), new THREE.Vector3(item.scale, item.scale, item.scale));
      meshRef.current.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const matrix = new THREE.Matrix4();
    const time = clock.getElapsedTime() * (outerDistance > 400 ? 0.005 : 0.02);
    transforms.forEach((item, index) => {
      const angle = item.angle + time;
      matrix.compose(new THREE.Vector3(Math.cos(angle) * item.radius, item.y, Math.sin(angle) * item.radius), new THREE.Quaternion(), new THREE.Vector3(item.scale, item.scale, item.scale));
      meshRef.current.setMatrixAt(index, matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {geometry === "icosahedron" ? <icosahedronGeometry args={[1, 0]} /> : <dodecahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial color={color} roughness={0.92} metalness={0.18} />
    </instancedMesh>
  );
}

function WormholeEffect() {
  const eventHorizonRef = useRef(null);
  const pulseRef = useRef(null);
  const timeoutRef = useRef(null);
  const { triggerWormhole, completeWormhole, isInWormhole, shipPosition } = useSimulationStore();
  const target = getBlackHoleScenePosition();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (eventHorizonRef.current) {
      eventHorizonRef.current.rotation.z = elapsed * 0.1;
    }
    if (pulseRef.current) {
      pulseRef.current.scale.setScalar(0.85 + Math.sin(elapsed * 2) * 0.15);
    }
    const ship = new THREE.Vector3(shipPosition.x, shipPosition.y, shipPosition.z);
    const blackHole = new THREE.Vector3(target.x, target.y, target.z);
    if (ship.distanceTo(blackHole) < 3 && !isInWormhole && !timeoutRef.current) {
      triggerWormhole();
      timeoutRef.current = window.setTimeout(() => {
        completeWormhole();
        timeoutRef.current = null;
      }, 1500);
    }
  });

  return (
    <group position={[target.x, target.y, target.z]}>
      <mesh>
        <sphereGeometry args={[2.15, 96, 96]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh ref={eventHorizonRef} rotation={[Math.PI / 2.45, 0.28, 0]}>
        <ringGeometry args={[2.8, 7.5, 192]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff7a18" emissiveIntensity={2.5} transparent opacity={0.92} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2.45, 0.28, 0]}>
        <ringGeometry args={[7.3, 15, 192]} />
        <meshStandardMaterial color="#ffffff" emissive="#892cdc" emissiveIntensity={1.25} transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[2.5, 96, 96]} />
        <meshBasicMaterial color="#ff641f" transparent opacity={0.24} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[32, 40, 40]} />
        <meshBasicMaterial color="#060611" transparent opacity={0.36} side={THREE.BackSide} />
      </mesh>
      <pointLight color="#ff6600" intensity={4} distance={90} decay={2} />
      <pointLight color="#00ffff" intensity={2.5} distance={60} decay={2} position={[0, 12, 0]} />
      <pointLight color="#00ffff" intensity={2.5} distance={60} decay={2} position={[0, -12, 0]} />
    </group>
  );
}

function Ship() {
  const shipRef = useRef(null);
  const rotationRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(0, 5, 50));
  const throttleRef = useRef(0);
  const targetFov = useRef(75);
  const keysRef = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false, rollLeft: false, rollRight: false });
  const { camera } = useThree();
  const {
    cameraMode,
    speedMode,
    isInWormhole,
    isPaused,
    setShipPosition,
    setShipVelocity,
    setSpeedMode,
    setVelocityFraction,
    updateTime,
    setFps,
    shipPosition,
  } = useSimulationStore();

  useEffect(() => {
    if (isInWormhole) {
      return undefined;
    }
    const externalPosition = new THREE.Vector3(shipPosition.x, shipPosition.y, shipPosition.z);
    if (positionRef.current.distanceTo(externalPosition) > 10) {
      positionRef.current.copy(externalPosition);
      throttleRef.current = 0;
      velocityRef.current.set(0, 0, 0);
    }
    return undefined;
  }, [isInWormhole, shipPosition]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isInWormhole) {
        return;
      }
      if (event.code.startsWith("Digit")) {
        setSpeedMode(Number.parseInt(event.code.replace("Digit", ""), 10));
      }
      if (event.code === "KeyW") keysRef.current.forward = true;
      if (event.code === "KeyS") keysRef.current.backward = true;
      if (event.code === "KeyA") keysRef.current.left = true;
      if (event.code === "KeyD") keysRef.current.right = true;
      if (event.code === "Space") keysRef.current.up = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") keysRef.current.down = true;
      if (event.code === "KeyQ") keysRef.current.rollLeft = true;
      if (event.code === "KeyE") keysRef.current.rollRight = true;
    };

    const onKeyUp = (event) => {
      if (event.code === "KeyW") keysRef.current.forward = false;
      if (event.code === "KeyS") keysRef.current.backward = false;
      if (event.code === "KeyA") keysRef.current.left = false;
      if (event.code === "KeyD") keysRef.current.right = false;
      if (event.code === "Space") keysRef.current.up = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") keysRef.current.down = false;
      if (event.code === "KeyQ") keysRef.current.rollLeft = false;
      if (event.code === "KeyE") keysRef.current.rollRight = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isInWormhole, setSpeedMode]);

  useFrame((state, delta) => {
    setFps(Math.round(1 / Math.max(delta, 1 / 240)));
    if (!shipRef.current) {
      return;
    }
    if (isInWormhole) {
      shipRef.current.rotation.z += delta * 10;
      return;
    }
    if (isPaused) {
      camera.lookAt(positionRef.current);
      return;
    }

    const mode = SPEED_MODES[speedMode];
    const turnStep = delta * 1.5;
    const thrustStep = 0.001 * mode.thrustMultiplier;
    const keys = keysRef.current;

    if (keys.left) rotationRef.current.y += turnStep;
    if (keys.right) rotationRef.current.y -= turnStep;
    if (keys.rollLeft) rotationRef.current.z += turnStep;
    if (keys.rollRight) rotationRef.current.z -= turnStep;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotationRef.current);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(rotationRef.current);

    if (keys.forward) throttleRef.current = Math.min(throttleRef.current + thrustStep * delta * 60, mode.maxVelocity);
    else if (keys.backward) throttleRef.current = Math.max(throttleRef.current - thrustStep * delta * 120, -(mode.maxVelocity * 0.5));
    else throttleRef.current = Math.abs(throttleRef.current *= 0.995) < 0.0001 ? 0 : throttleRef.current;

    throttleRef.current = Math.max(-(mode.maxVelocity * 0.5), Math.min(throttleRef.current, mode.maxVelocity));
    velocityRef.current.copy(forward).multiplyScalar(throttleRef.current * 1000 * delta);
    const verticalStep = mode.maxVelocity * 1000 * 0.3 * delta;
    if (keys.up) velocityRef.current.addScaledVector(up, verticalStep);
    if (keys.down) velocityRef.current.addScaledVector(up, -verticalStep);

    positionRef.current.add(velocityRef.current);
    const absoluteVelocity = Math.abs(throttleRef.current);
    setVelocityFraction(Math.min(absoluteVelocity, 0.9999));
    setShipPosition(positionRef.current.clone());
    setShipVelocity(velocityRef.current.clone());
    updateTime(delta);

    shipRef.current.position.copy(positionRef.current);
    shipRef.current.rotation.copy(rotationRef.current);

    if (cameraMode === "follow") {
      const cameraOffset = new THREE.Vector3(0, 2, 8).applyEuler(rotationRef.current);
      const cameraPosition = positionRef.current.clone().add(cameraOffset);
      camera.position.lerp(cameraPosition, 0.1);
      camera.lookAt(positionRef.current);
      targetFov.current = 75 + (absoluteVelocity / 0.9999) * 30;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.05);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group ref={shipRef} position={[0, 5, 50]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.26, 0.34, 1.9, 24]} /><meshStandardMaterial color="#9ba9bc" metalness={0.75} roughness={0.24} /></mesh>
      <mesh position={[0, 0, -1.12]}><coneGeometry args={[0.26, 0.62, 24]} /><meshStandardMaterial color="#c7d1dd" metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0, 0.95]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.3, 0.45, 20]} /><meshStandardMaterial color="#9ba9bc" metalness={0.75} roughness={0.24} /></mesh>
      <mesh position={[0, 0.18, -0.58]}><sphereGeometry args={[0.22, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#4fd5ff" emissive="#0bbde4" emissiveIntensity={0.3} roughness={0.08} transmission={0.35} transparent opacity={0.88} /></mesh>
      <mesh position={[0.65, -0.12, 0]} rotation={[0.08, 0, Math.PI / 8]}><boxGeometry args={[1.05, 0.05, 0.56]} /><meshStandardMaterial color="#9ba9bc" metalness={0.78} roughness={0.22} /></mesh>
      <mesh position={[-0.65, -0.12, 0]} rotation={[0.08, 0, -Math.PI / 8]}><boxGeometry args={[1.05, 0.05, 0.56]} /><meshStandardMaterial color="#9ba9bc" metalness={0.78} roughness={0.22} /></mesh>
      <mesh position={[0, 0.33, 0.45]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.08, 0.36, 0.35]} /><meshStandardMaterial color="#9ba9bc" metalness={0.72} roughness={0.24} /></mesh>
      <mesh position={[0, 0, 1.26]}><sphereGeometry args={[0.14, 20, 20]} /><meshBasicMaterial color="#2de2ff" /></mesh>
      <mesh position={[0, 0, 1.42]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.08, 0.44, 18]} /><meshBasicMaterial color="#8cf4ff" transparent opacity={0.7} /></mesh>
      <pointLight position={[0, 0, 1.15]} color="#06d2ff" intensity={1.4} distance={9} />
    </group>
  );
}

function SolarSystem() {
  return (
    <group>
      <ambientLight intensity={0.12} />
      {CELESTIAL_BODIES.filter((body) => body.type !== "blackhole").map((body) => <PlanetBody key={body.id} body={body} />)}
      <AsteroidBelt innerDistance={getScaledDistance(300)} outerDistance={getScaledDistance(500)} count={800} color="#6b6b6b" />
      <AsteroidBelt innerDistance={getScaledDistance(4600)} outerDistance={getScaledDistance(8000)} count={500} color="#4a4a5a" geometry="icosahedron" />
    </group>
  );
}

function Scene() {
  const cameraMode = useSimulationStore((state) => state.cameraMode);
  return (
    <>
      <SceneBackground />
      <Stars radius={300} depth={100} count={10000} factor={6} saturation={0} fade speed={0.5} />
      <ambientLight intensity={0.1} />
      <directionalLight position={[10, 10, 10]} intensity={0.5} />
      <SolarSystem />
      <WormholeEffect />
      <Ship />
      {cameraMode === "free" ? <OrbitControls enableDamping dampingFactor={0.05} maxDistance={3500} /> : null}
    </>
  );
}

function MainScene() {
  return (
    <Canvas camera={{ position: [0, 10, 60], fov: 75, near: 0.1, far: 10000 }} className="scene-canvas">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}

function SpeedHud() {
  const speedMode = useSimulationStore((state) => state.speedMode);
  const velocityFraction = useSimulationStore((state) => state.velocityFraction);
  return (
    <HudPanel className="speed-panel">
      <div className="panel-heading"><span>Speed Mode</span><span className="mode-name">{SPEED_MODES[speedMode].name}</span></div>
      <div className="metric-list">
        <div className="metric-row"><span>Velocity</span><span className="metric-cyan">{(velocityFraction * 100).toFixed(4)}% c</span></div>
        <div className="metric-row"><span>Lorentz Factor</span><span className="metric-amber">{(1 / Math.sqrt(Math.max(0.0001, 1 - velocityFraction * velocityFraction))).toFixed(6)}</span></div>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${velocityFraction * 100}%` }} /></div>
      <div className="speed-mode-grid">
        {Object.entries(SPEED_MODES).map(([key]) => (
          <button type="button" key={key} className={Number(key) === speedMode ? "mode-button active" : "mode-button"} onClick={() => useSimulationStore.getState().setSpeedMode(Number(key))}>
            {key}
          </button>
        ))}
      </div>
    </HudPanel>
  );
}

function MiniMap() {
  const shipPosition = useSimulationStore((state) => state.shipPosition);
  const returnToSolarSystem = useSimulationStore((state) => state.returnToSolarSystem);
  const blackHole = getBlackHoleScenePosition();
  const scale = 0.18;
  const xzDistance = Math.sqrt(shipPosition.x ** 2 + shipPosition.z ** 2);
  return (
    <HudPanel className="map-panel">
      <div className="section-title">Solar Map</div>
      <div className="solar-map">
        <div className="orbit orbit-outer" />
        <div className="orbit orbit-inner" />
        <div className="map-dot sun-dot" style={{ left: "50%", top: "47.4737%" }} />
        <div className="map-dot black-hole-dot" style={{ left: `${50 + blackHole.x * scale}%`, top: `${50 + blackHole.z * scale}%` }} />
        <div className="map-dot ship-dot" style={{ left: `${50 + shipPosition.x * scale}%`, top: `${50 + shipPosition.z * scale}%` }} />
      </div>
      <div className="distance-label">XZ Distance: <span>{xzDistance.toFixed(1)}</span></div>
      <button type="button" className="secondary-button" onClick={returnToSolarSystem}>Snap Back to Solar System</button>
    </HudPanel>
  );
}

function TimeHud() {
  const earthTime = useSimulationStore((state) => state.earthTime);
  const shipTime = useSimulationStore((state) => state.shipTime);
  return (
    <HudPanel className="time-panel">
      <div className="section-title">Time Dilation</div>
      <div className="metric-list">
        <div className="metric-row"><span className="legend-label"><span className="dot blue" />Earth Time</span><span className="metric-blue">{formatClock(earthTime)}</span></div>
        <div className="metric-row"><span className="legend-label"><span className="dot green" />Ship Time</span><span className="metric-green">{formatClock(shipTime)}</span></div>
      </div>
    </HudPanel>
  );
}

function CoordinatesHud() {
  const shipPosition = useSimulationStore((state) => state.shipPosition);
  return (
    <HudPanel className="coord-panel">
      <div className="section-title">Coordinates</div>
      <div className="coordinates-grid">
        <div className="coordinate-row"><span className="axis-x">X:</span><span>{shipPosition.x.toFixed(2)}</span></div>
        <div className="coordinate-row"><span className="axis-y">Y:</span><span>{shipPosition.y.toFixed(2)}</span></div>
        <div className="coordinate-row"><span className="axis-z">Z:</span><span>{shipPosition.z.toFixed(2)}</span></div>
      </div>
    </HudPanel>
  );
}

function ControlHud() {
  const fps = useSimulationStore((state) => state.fps);
  const cameraMode = useSimulationStore((state) => state.cameraMode);
  const isPaused = useSimulationStore((state) => state.isPaused);
  const setCameraMode = useSimulationStore((state) => state.setCameraMode);
  const togglePause = useSimulationStore((state) => state.togglePause);
  const reset = useSimulationStore((state) => state.reset);
  return (
    <HudPanel className="control-panel">
      <div className="control-buttons">
        <button type="button" className="secondary-button" onClick={() => setCameraMode(cameraMode === "follow" ? "free" : "follow")}>{cameraMode === "follow" ? "Free Camera" : "Follow Camera"}</button>
        <button type="button" className="pause-button" onClick={togglePause}>{isPaused ? "Resume" : "Pause"}</button>
        <button type="button" className="reset-button" onClick={reset}>Reset</button>
      </div>
      <div className="fps-label">FPS: <span>{fps}</span></div>
    </HudPanel>
  );
}

function ControlsHint() {
  return (
    <div className="controls-hint">
      <span className="mono">W/S</span> Forward/Back | <span className="mono">A/D</span> Turn | <span className="mono">Space/Shift</span> Up/Down | <span className="mono">Q/E</span> Roll | <span className="mono">1-6</span> Speed Mode
    </div>
  );
}

export default function App() {
  return (
    <main className="app-shell">
      <MainScene />
      <div className="hud-layer">
        <div className="hud-top-left"><SpeedHud /></div>
        <div className="hud-top-right"><TimeHud /></div>
        <div className="hud-mid-right"><MiniMap /></div>
        <div className="hud-bottom-left"><CoordinatesHud /></div>
        <div className="hud-bottom-right"><ControlHud /></div>
        <div className="hud-bottom-center"><ControlsHint /></div>
      </div>
    </main>
  );
}
