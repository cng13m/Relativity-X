import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  CELESTIAL_BODIES,
  SPEED_MODES,
  getBlackHoleScenePosition,
  getOrbitalPosition,
  getScaledDistance,
  getScaledRadius,
  getScaledSatelliteDistance,
  useSimulationStore,
} from "./simulation";
import { createBodyTextures } from "./textures";

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
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    context.fillStyle = "#03050b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 2200; i += 1) {
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
  const bodyRef = useRef(null);
  const meshRef = useRef(null);
  const cloudRef = useRef(null);
  const activeElapsedRef = useRef(0);
  const radius = getScaledRadius(body.radius, body.type);
  const parentBody = body.parentId ? CELESTIAL_BODIES.find((item) => item.id === body.parentId) : null;
  const parentRadius = parentBody ? getScaledRadius(parentBody.radius, parentBody.type) : 0;
  const orbitDistance = body.type === "moon" ? getScaledSatelliteDistance(body.distanceFromParent, parentRadius) : getScaledDistance(body.distanceFromSun);
  const axialTilt = ((body.axialTilt ?? 0) * Math.PI) / 180;
  const detailSegments = body.type === "star" || radius > 2.5 ? 48 : radius > 0.6 ? 40 : 28;
  const textures = useMemo(() => createBodyTextures(), []);
  const planetTextures = textures.planets[body.id];
  const isPaused = useSimulationStore((state) => state.isPaused);
  const setSelectedBody = useSimulationStore((state) => state.setSelectedBody);

  const getBodyPosition = (elapsedSeconds = 0) => {
    if (body.type === "moon" && parentBody) {
      const parentPosition = getOrbitalPosition(parentBody, elapsedSeconds);
      return getOrbitalPosition(body, elapsedSeconds, parentPosition, orbitDistance);
    }
    if (body.distanceFromSun === 0 || body.type === "moon") {
      return { x: 0, y: 0, z: 0 };
    }
    return getOrbitalPosition(body, elapsedSeconds, { x: 0, y: 0, z: 0 }, orbitDistance);
  };

  const orbitPoints = useMemo(() => {
    if (body.distanceFromSun === 0 || body.type === "moon") {
      return null;
    }
    const points = [];
    const center = { x: 0, y: 0, z: 0 };
    const parentCenter = parentBody ? getOrbitalPosition(parentBody, 0) : center;
    const steps = body.type === "moon" ? 96 : 192;
    for (let step = 0; step <= steps; step += 1) {
      const orbitBody = { ...body, initialAngle: (step / steps) * Math.PI * 2, orbitalPeriod: 1 };
      const position = getOrbitalPosition(orbitBody, 0, parentBody ? parentCenter : center, orbitDistance);
      points.push([position.x, position.y, position.z]);
    }
    return points;
  }, [body, orbitDistance, parentBody]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !meshRef.current) {
      return;
    }
    if (isPaused) {
      return;
    }
    activeElapsedRef.current += delta;
    if (body.orbitalPeriod === 0) {
      meshRef.current.rotation.y += 0.0014;
      return;
    }

    const position = getBodyPosition(activeElapsedRef.current);
    bodyRef.current.position.set(position.x, position.y, position.z);
    meshRef.current.rotation.y += body.id === "venus" ? -0.0012 : 0.0028;
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.0036;
    }
  });

  const initialPosition = getBodyPosition(0);

  return (
    <group>
      {orbitPoints ? <Line points={orbitPoints} color={body.type === "moon" ? "#6d7887" : "#415063"} lineWidth={1} transparent opacity={body.type === "moon" ? 0.26 : 0.32} /> : null}
      <group ref={bodyRef} position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
        <group rotation={[0, 0, axialTilt]}>
          <mesh
            ref={meshRef}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedBody(body);
            }}
          >
            <sphereGeometry args={[radius, detailSegments, detailSegments]} />
            {body.type === "star" ? (
              <meshBasicMaterial map={planetTextures.map} color={body.color} />
            ) : (
              <meshStandardMaterial
                map={planetTextures.map}
                bumpMap={planetTextures.bumpMap}
                bumpScale={body.id === "mercury" ? 0.12 : body.id === "moon" ? 0.1 : body.id === "mars" ? 0.05 : body.id === "earth" ? 0.03 : 0.015}
                roughnessMap={planetTextures.roughnessMap}
                emissiveMap={planetTextures.emissiveMap}
                color={body.color}
                emissive={body.id === "earth" ? "#17358d" : body.color}
                emissiveIntensity={body.id === "earth" ? 0.22 : body.type === "planet" ? 0.012 : 0}
                roughness={body.id === "earth" ? 0.72 : body.id === "jupiter" || body.id === "saturn" ? 0.82 : body.id === "uranus" || body.id === "neptune" ? 0.68 : 0.9}
                metalness={0.01}
              />
            )}
          </mesh>
          {body.id === "earth" ? (
            <mesh ref={cloudRef}>
              <sphereGeometry args={[radius * 1.026, detailSegments, detailSegments]} />
              <meshStandardMaterial map={planetTextures.cloudMap} transparent opacity={0.38} depthWrite={false} roughness={1} metalness={0} />
            </mesh>
          ) : null}
          {body.id === "saturn" ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius * 1.25, radius * 2.35, 128]} />
              <meshStandardMaterial map={textures.saturnRing.map} alphaMap={textures.saturnRing.alphaMap} color="#d8c6a2" side={THREE.DoubleSide} transparent opacity={0.86} alphaTest={0.18} />
            </mesh>
          ) : null}
          {body.id === "uranus" ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius * 1.45, radius * 1.95, 80]} />
              <meshStandardMaterial map={textures.uranusRing.map} alphaMap={textures.uranusRing.alphaMap} color="#8ea5aa" side={THREE.DoubleSide} transparent opacity={0.3} alphaTest={0.12} />
            </mesh>
          ) : null}
        </group>
        {body.type === "star" ? (
          <>
            <pointLight position={[0, 0, 0]} color="#fff5e0" intensity={3.8} distance={240} decay={1} />
            <mesh><sphereGeometry args={[radius * 1.12, 32, 32]} /><meshBasicMaterial color="#ffd96a" transparent opacity={0.3} /></mesh>
            <mesh><sphereGeometry args={[radius * 1.32, 32, 32]} /><meshBasicMaterial color="#ff9c37" transparent opacity={0.16} /></mesh>
          </>
        ) : null}
      </group>
    </group>
  );
}

function AsteroidBelt({ innerDistance, outerDistance, count, color, geometry = "dodecahedron" }) {
  const meshRef = useRef(null);
  const activeElapsedRef = useRef(0);
  const textures = useMemo(() => createBodyTextures(), []);
  const isPaused = useSimulationStore((state) => state.isPaused);
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

  useFrame((state, delta) => {
    if (!meshRef.current || isPaused) {
      return;
    }
    activeElapsedRef.current += delta;
    const matrix = new THREE.Matrix4();
    const time = activeElapsedRef.current * (outerDistance > 400 ? 0.005 : 0.02);
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
      <meshStandardMaterial
        map={(geometry === "icosahedron" ? textures.kuiper : textures.asteroid).map}
        bumpMap={(geometry === "icosahedron" ? textures.kuiper : textures.asteroid).bumpMap}
        bumpScale={0.06}
        roughnessMap={(geometry === "icosahedron" ? textures.kuiper : textures.asteroid).roughnessMap}
        color={color}
        roughness={0.95}
        metalness={0.03}
      />
    </instancedMesh>
  );
}

function WormholeEffect() {
  const eventHorizonRef = useRef(null);
  const pulseRef = useRef(null);
  const timeoutRef = useRef(null);
  const activeElapsedRef = useRef(0);
  const { triggerWormhole, completeWormhole, isInWormhole, isPaused, shipPosition, setSelectedBody } = useSimulationStore();
  const blackHoleBody = CELESTIAL_BODIES.find((body) => body.id === "blackhole");
  const target = getBlackHoleScenePosition();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useFrame((state, delta) => {
    if (isPaused) {
      return;
    }
    activeElapsedRef.current += delta;
    const elapsed = activeElapsedRef.current;
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
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          setSelectedBody(blackHoleBody);
        }}
      >
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
  const flameRef = useRef(null);
  const flameGlowRef = useRef(null);
  const rotationRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const maneuverLeanRef = useRef({ pitch: 0, roll: 0 });
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const positionRef = useRef(new THREE.Vector3(0, 5, 50));
  const throttleRef = useRef(0);
  const targetFov = useRef(75);
  const keysRef = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false, rollLeft: false, rollRight: false });
  const { camera } = useThree();
  const textures = useMemo(() => createBodyTextures(), []);
  const shipMaterial = textures.ship;
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

    const targetRoll = (keys.left ? 0.42 : 0) + (keys.right ? -0.42 : 0);
    const targetPitch = (keys.up ? -0.2 : 0) + (keys.down ? 0.2 : 0);
    maneuverLeanRef.current.roll = THREE.MathUtils.lerp(maneuverLeanRef.current.roll, targetRoll, 0.08);
    maneuverLeanRef.current.pitch = THREE.MathUtils.lerp(maneuverLeanRef.current.pitch, targetPitch, 0.08);

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotationRef.current);
    const up = new THREE.Vector3(0, 1, 0).applyEuler(rotationRef.current);

    if (keys.forward) throttleRef.current = Math.min(throttleRef.current + thrustStep * delta * 60, mode.maxVelocity);
    else if (keys.backward) throttleRef.current = Math.max(throttleRef.current - thrustStep * delta * 120, -(mode.maxVelocity * 0.5));
    else throttleRef.current = Math.abs(throttleRef.current *= 0.995) < 0.0001 ? 0 : throttleRef.current;

    throttleRef.current = Math.max(-(mode.maxVelocity * 0.5), Math.min(throttleRef.current, mode.maxVelocity));
    const thrustVisibility = Math.min(1, 0.35 + Math.abs(throttleRef.current) / Math.max(mode.maxVelocity, 0.001));
    if (flameRef.current && flameGlowRef.current) {
      const forwardThrust = Math.max(0.2, thrustVisibility);
      flameRef.current.scale.set(1, 1, 0.75 + forwardThrust * 1.8);
      flameRef.current.material.opacity = 0.45 + forwardThrust * 0.35;
      flameGlowRef.current.scale.setScalar(0.9 + forwardThrust * 0.9);
      flameGlowRef.current.material.opacity = 0.18 + forwardThrust * 0.28;
    }
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
    shipRef.current.rotateX(maneuverLeanRef.current.pitch);
    shipRef.current.rotateZ(maneuverLeanRef.current.roll);

    if (cameraMode === "follow") {
      const cameraOffset = new THREE.Vector3(0, 0.85, 3.4).applyEuler(rotationRef.current);
      const cameraPosition = positionRef.current.clone().add(cameraOffset);
      camera.position.lerp(cameraPosition, 0.1);
      camera.lookAt(positionRef.current);
      targetFov.current = 75 + (absoluteVelocity / 0.9999) * 30;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.05);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group ref={shipRef} position={[0, 5, 50]} scale={0.22}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.26, 0.34, 1.9, 24]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#9ba9bc" metalness={0.8} roughness={0.22} /></mesh>
      <mesh position={[0, 0, -1.12]}><coneGeometry args={[0.26, 0.62, 24]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#c7d1dd" metalness={0.82} roughness={0.18} /></mesh>
      <mesh position={[0, 0, 0.95]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.3, 0.45, 20]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#9ba9bc" metalness={0.8} roughness={0.22} /></mesh>
      <mesh position={[0, 0.18, -0.58]}><sphereGeometry args={[0.22, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#4fd5ff" emissive="#0bbde4" emissiveIntensity={0.3} roughness={0.08} transmission={0.35} transparent opacity={0.88} /></mesh>
      <mesh position={[0.65, -0.12, 0]} rotation={[0.08, 0, Math.PI / 8]}><boxGeometry args={[1.05, 0.05, 0.56]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#9ba9bc" metalness={0.78} roughness={0.22} /></mesh>
      <mesh position={[-0.65, -0.12, 0]} rotation={[0.08, 0, -Math.PI / 8]}><boxGeometry args={[1.05, 0.05, 0.56]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#9ba9bc" metalness={0.78} roughness={0.22} /></mesh>
      <mesh position={[0, 0.33, 0.45]} rotation={[0.12, 0, 0]}><boxGeometry args={[0.08, 0.36, 0.35]} /><meshStandardMaterial map={shipMaterial.map} bumpMap={shipMaterial.bumpMap} bumpScale={0.02} roughnessMap={shipMaterial.roughnessMap} color="#9ba9bc" metalness={0.72} roughness={0.24} /></mesh>
      <mesh position={[0, 0, 1.26]}><sphereGeometry args={[0.14, 20, 20]} /><meshBasicMaterial color="#2de2ff" /></mesh>
      <mesh ref={flameRef} position={[0, 0, 1.72]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 1.2, 24, 1, true]} />
        <meshBasicMaterial color="#48ddff" transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={flameGlowRef} position={[0, 0, 1.95]}>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshBasicMaterial color="#0bcfff" transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 0, 1.6]} color="#06d2ff" intensity={2.2} distance={18} />
      <pointLight position={[0, 0, 1.15]} color="#06d2ff" intensity={1.4} distance={9} />
    </group>
  );
}

function SolarSystem() {
  return (
    <group>
      <ambientLight intensity={0.12} />
      {CELESTIAL_BODIES.filter((body) => body.type !== "blackhole").map((body) => <PlanetBody key={body.id} body={body} />)}
      <AsteroidBelt innerDistance={getScaledDistance(300)} outerDistance={getScaledDistance(500)} count={520} color="#6b6b6b" />
      <AsteroidBelt innerDistance={getScaledDistance(4600)} outerDistance={getScaledDistance(8000)} count={320} color="#4a4a5a" geometry="icosahedron" />
    </group>
  );
}

function Scene() {
  const cameraMode = useSimulationStore((state) => state.cameraMode);
  const isPaused = useSimulationStore((state) => state.isPaused);
  return (
    <>
      <SceneBackground />
      <Stars radius={300} depth={100} count={4500} factor={5} saturation={0} fade speed={isPaused ? 0 : 0.25} />
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
    <Canvas
      camera={{ position: [0, 10, 60], fov: 75, near: 0.1, far: 10000 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      performance={{ min: 0.5 }}
      className="scene-canvas"
    >
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
  const maxExtent = Math.max(
    60,
    Math.abs(shipPosition.x),
    Math.abs(shipPosition.z),
    Math.abs(blackHole.x),
    Math.abs(blackHole.z),
  ) * 1.15;
  const toPercent = (value) => 50 + (value / maxExtent) * 46;
  const shipLeft = toPercent(shipPosition.x);
  const shipTop = toPercent(shipPosition.z);
  const blackHoleLeft = toPercent(blackHole.x);
  const blackHoleTop = toPercent(blackHole.z);
  const xzDistance = Math.sqrt(shipPosition.x ** 2 + shipPosition.z ** 2);
  const blackHoleDistance = Math.sqrt((blackHole.x - shipPosition.x) ** 2 + (blackHole.z - shipPosition.z) ** 2);
  return (
    <HudPanel className="map-panel">
      <div className="panel-heading">
        <span>Solar Map</span>
        <span className="mode-name">Guidance</span>
      </div>
      <div className="solar-map">
        <div className="orbit orbit-outer" />
        <div className="orbit orbit-inner" />
        <div
          className="map-route"
          style={{
            left: "50%",
            top: "50%",
            width: `${Math.hypot(blackHoleLeft - 50, blackHoleTop - 50)}%`,
            transform: `translateY(-50%) rotate(${Math.atan2(blackHoleTop - 50, blackHoleLeft - 50)}rad)`,
          }}
        />
        <div
          className="map-route map-route-ship"
          style={{
            left: `${shipLeft}%`,
            top: `${shipTop}%`,
            width: `${Math.hypot(blackHoleLeft - shipLeft, blackHoleTop - shipTop)}%`,
            transform: `translateY(-50%) rotate(${Math.atan2(blackHoleTop - shipTop, blackHoleLeft - shipLeft)}rad)`,
          }}
        />
        <div className="map-dot sun-dot" style={{ left: "50%", top: "47.4737%" }} />
        <div className="map-dot black-hole-dot" style={{ left: `${blackHoleLeft}%`, top: `${blackHoleTop}%` }} />
        <div className="map-dot ship-dot" style={{ left: `${shipLeft}%`, top: `${shipTop}%` }} />
        <div className="map-tag map-tag-black-hole" style={{ left: `${blackHoleLeft}%`, top: `${blackHoleTop}%` }}>BH</div>
        <div className="map-tag map-tag-ship" style={{ left: `${shipLeft}%`, top: `${shipTop}%` }}>YOU</div>
      </div>
      <div className="map-stats">
        <div className="metric-row"><span>XZ Distance</span><span className="metric-cyan">{xzDistance.toFixed(1)}</span></div>
        <div className="metric-row"><span>Black Hole Range</span><span className="metric-amber">{blackHoleDistance.toFixed(1)}</span></div>
      </div>
      <p className="map-caption">Follow the cyan route from your ship toward the red black-hole marker.</p>
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
        <button type="button" className="secondary-button" onClick={() => setCameraMode(cameraMode === "follow" ? "free" : "follow")}>{cameraMode === "follow" ? "Free Camera" : "Follow Ship"}</button>
        <button type="button" className="pause-button" onClick={togglePause}>{isPaused ? "Resume" : "Pause"}</button>
        <button type="button" className="reset-button" onClick={reset}>Reset</button>
      </div>
      <div className="fps-label">FPS: <span>{fps}</span></div>
    </HudPanel>
  );
}

function StopStartButton() {
  const isPaused = useSimulationStore((state) => state.isPaused);
  const togglePause = useSimulationStore((state) => state.togglePause);

  return (
    <button type="button" className={isPaused ? "stop-start-button start" : "stop-start-button stop"} onClick={togglePause}>
      {isPaused ? "Start" : "Stop"}
    </button>
  );
}

function InfoHud() {
  const selectedBody = useSimulationStore((state) => state.selectedBody);
  const setSelectedBody = useSimulationStore((state) => state.setSelectedBody);

  if (!selectedBody) {
    return null;
  }

  const parentBody = selectedBody.parentId ? CELESTIAL_BODIES.find((body) => body.id === selectedBody.parentId) : null;
  const distanceLabel = parentBody
    ? `${selectedBody.distanceFromParent.toLocaleString()} million km from ${parentBody.name}`
    : `${selectedBody.distanceFromSun.toLocaleString()} million km`;

  return (
    <HudPanel className="info-panel">
      <div className="info-header-row">
        <div>
          <div className="section-title info-title">{selectedBody.name}</div>
          <div className="info-type">{selectedBody.type}</div>
        </div>
        <button type="button" className="info-close-button" onClick={() => setSelectedBody(null)}>Close</button>
      </div>
      <div className="info-block">
        <div className="info-label">What It Is</div>
        <p className="info-copy">{selectedBody.summary}</p>
      </div>
      <div className="info-block">
        <div className="info-label">A Little History</div>
        <p className="info-copy">{selectedBody.history}</p>
      </div>
      <div className="info-facts">
        <div className="metric-row"><span>{parentBody ? "Parent Distance" : "Distance From Sun"}</span><span className="metric-cyan">{distanceLabel}</span></div>
        <div className="metric-row"><span>Radius</span><span className="metric-blue">{selectedBody.radius.toLocaleString()} km</span></div>
        <div className="metric-row"><span>Orbital Period</span><span className="metric-amber">{selectedBody.orbitalPeriod === 0 ? "Center object" : `${selectedBody.orbitalPeriod.toLocaleString()} days`}</span></div>
        <div className="metric-row"><span>Inclination</span><span className="metric-green">{`${(selectedBody.orbitalInclination ?? 0).toFixed(1)} deg`}</span></div>
        <div className="metric-row"><span>Eccentricity</span><span className="metric-cyan">{(selectedBody.orbitalEccentricity ?? 0).toFixed(3)}</span></div>
        <div className="metric-row"><span>Axial Tilt</span><span className="metric-amber">{`${(selectedBody.axialTilt ?? 0).toFixed(1)} deg`}</span></div>
      </div>
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
        <div className="hud-top-center"><StopStartButton /></div>
        <div className="hud-left-stack"><InfoHud /></div>
        <div className="hud-top-right"><TimeHud /></div>
        <div className="hud-mid-right"><MiniMap /></div>
        <div className="hud-bottom-left"><CoordinatesHud /></div>
        <div className="hud-bottom-right"><ControlHud /></div>
        <div className="hud-bottom-center"><ControlsHint /></div>
      </div>
    </main>
  );
}
