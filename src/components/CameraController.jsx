import React, { useState, useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Reusable scratch vectors to avoid per-frame heap allocations during flight & animation
const _scratchRight = new THREE.Vector3();
const _scratchForward = new THREE.Vector3();
const _scratchUp = new THREE.Vector3();
const _scratchWish = new THREE.Vector3();
const _scratchStep = new THREE.Vector3();
const _scratchNormal = new THREE.Vector3();
const _scratchDynamicCamPos = new THREE.Vector3();
const _scratchCurrentTargetPos = new THREE.Vector3();
const _scratchFollowPos = new THREE.Vector3();
const _scratchFollowDelta = new THREE.Vector3();
const _scratchTurn = new THREE.Quaternion();
const _scratchAim = new THREE.Quaternion();
const _scratchLook = new THREE.Vector3();

// Ease in and out: spool up, cruise, settle (no jolt at take-off)
const easeInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

// Flight feel tuning knobs
const CRUISE_SPEED = 80; // units/s
const BOOST = 2.5; // Shift multiplier
const ACCEL = 4; // 1/s: how fast you reach the wanted speed (higher = snappier)
const GLIDE = 2.5; // 1/s: how fast you coast to a stop after letting go (lower = floatier)
const BOOST_FOV = 8; // degrees the view widens at full boost, for a sense of speed
const SCROLL_THRUST = 0.6; // units/s of thrust per pixel of scroll while free-looking
const LOOK_PIVOT = 1; // free-look orbits a point this close ahead, which is turning in place
const TURN_END = 0.35; // share of a fly-to spent turning to face the target
const MOVE_START = 0.15; // travel starts before the turn ends, so it reads as one motion

function CameraController({ target, selected, onComplete, movementRadius = 650, enabled = true }) {
  const { camera, scene, gl } = useThree();
  const controlsRef = useRef();
  const [isAnimating, setIsAnimating] = useState(false);
  // Free-look while flying (drag turns the view in place); orbit mode around a selected object otherwise
  const [freeLook, setFreeLook] = useState(false);
  const freeLookRef = useRef(false);
  const [baseFov] = useState(camera.fov);
  const animFrameIdRef = useRef(null);
  const keysRef = useRef({});
  const targetOffsetRef = useRef(new THREE.Vector3());
  const velocityRef = useRef(new THREE.Vector3());
  const lastCamPosRef = useRef(camera.position.clone());
  // Orbiting target the camera keeps riding along with after arrival (null = not following)
  const followRef = useRef(null);
  const lastFollowPosRef = useRef(new THREE.Vector3());

  // Input handlers
  useEffect(() => {
    const down = (e) => {
      if (!enabled || e.target instanceof HTMLInputElement) return; // typing in the catalog search isn't flying
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    // Keyups are lost while the window is unfocused; without this a held key would fly you forever
    const clear = () => {
      keysRef.current = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [enabled]);

  const setLookMode = useCallback(
    (on) => {
      const controls = controlsRef.current;
      if (!controls || freeLookRef.current === on) return;
      freeLookRef.current = on;
      if (on) {
        // Pull the pivot in along the current view, so nothing visibly moves
        _scratchForward.subVectors(controls.target, camera.position).normalize();
        controls.target.copy(camera.position).addScaledVector(_scratchForward, LOOK_PIVOT);
        // Applied now, not on the next render, so the controls never push the camera back out to minDistance
        controls.minDistance = 0;
        controls.enableZoom = false;
        controls.enablePan = false;
      }
      setFreeLook(on);
    },
    [camera]
  );

  // While free-looking, scroll is a smooth forward/back thrust (in orbit mode the controls zoom instead)
  useEffect(() => {
    const onWheel = (e) => {
      if (!enabled || !freeLookRef.current) return;
      const pixels = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // Firefox scrolls in lines
      _scratchForward.setFromMatrixColumn(camera.matrixWorld, 2).negate();
      velocityRef.current
        .addScaledVector(_scratchForward, -pixels * SCROLL_THRUST)
        .clampLength(0, CRUISE_SPEED * BOOST);
    };
    gl.domElement.addEventListener("wheel", onWheel, { passive: true });
    return () => gl.domElement.removeEventListener("wheel", onWheel);
  }, [gl, camera, enabled]);

  useEffect(() => {
    // Cancel any ongoing animation loop before starting a new one
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    followRef.current = null;

    if (!target || !controlsRef.current) return;

    setIsAnimating(true);
    velocityRef.current.set(0, 0, 0); // the flight takes over from any coasting

    // Calculate optimal camera framing distance dynamically based on object size & type
    const objectSize = target.size || 8;
    let distance = Math.max(38, objectSize * 3.2);

    if (target.hasRings) {
      // Planetary rings extend up to 3.2x planet size
      distance = Math.max(distance, objectSize * 5.5);
    } else if (target.name && (target.name.includes("Sun") || target.name.includes("Sol"))) {
      // Sol is size 30; frame at a comfortable distance so it doesn't overflow screen
      distance = 115;
    }

    // Backdrop nebulae follow the camera, so a flight would never arrive: turn in place (free-look) to face
    // them instead. Everything else is flown to and then orbited
    const isBackdrop = target.type === "nebula";
    setLookMode(isBackdrop);

    const actualTargetPos = new THREE.Vector3(...target.position);
    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const aimDir = startTarget.clone().sub(startPos).normalize();
    const aimRadius = startPos.distanceTo(startTarget);
    const turn = new THREE.Quaternion().setFromUnitVectors(aimDir, actualTargetPos.clone().normalize());

    // Moving objects (orbiting comets) tag their root node with isTrackedRoot.
    // Find it ONCE rather than traversing the whole scene every frame
    let trackedNode = null;
    scene.traverse((child) => {
      if (
        !trackedNode &&
        child.userData &&
        child.userData.objectId === target.id &&
        child.userData.isTrackedRoot
      ) {
        trackedNode = child;
        child.getWorldPosition(actualTargetPos);
      }
    });

    // Arrive on the side we came from (a little above), so the flight heads straight in instead of arcing around
    targetOffsetRef.current
      .subVectors(startPos, actualTargetPos)
      .normalize()
      .addScaledVector(camera.up, 0.3)
      .normalize()
      .multiplyScalar(distance);

    let progress = 0;
    // Longer trips take longer, so short hops don't crawl and cross-map flights don't blur past
    const duration = isBackdrop
      ? 1500
      : THREE.MathUtils.clamp(1200 + startPos.distanceTo(actualTargetPos) * 4, 1600, 3900);
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      progress = Math.min(elapsed / duration, 1);
      const eased = easeInOut(progress);

      if (isBackdrop) {
        // Swing the aim point around the camera at the same orbit radius; the camera itself stays put
        _scratchTurn.identity().slerp(turn, eased);
        controlsRef.current.target
          .copy(aimDir)
          .applyQuaternion(_scratchTurn)
          .multiplyScalar(aimRadius)
          .add(startPos);
        controlsRef.current.update();
      } else {
        // Follow moving targets via cached node reference
        if (trackedNode) {
          trackedNode.getWorldPosition(_scratchCurrentTargetPos);
        } else {
          _scratchCurrentTargetPos.copy(actualTargetPos);
        }

        // Fly in, starting once the turn is under way
        const moveT = easeInOut(THREE.MathUtils.clamp((progress - MOVE_START) / (1 - MOVE_START), 0, 1));
        _scratchDynamicCamPos.copy(_scratchCurrentTargetPos).add(targetOffsetRef.current);
        camera.position.lerpVectors(startPos, _scratchDynamicCamPos, moveT);

        // Swing the view from where we were looking onto the target, then keep it locked there
        _scratchLook.subVectors(_scratchCurrentTargetPos, camera.position);
        const reach = _scratchLook.length();
        _scratchAim.setFromUnitVectors(aimDir, _scratchLook.divideScalar(reach));
        _scratchTurn.identity().slerp(_scratchAim, THREE.MathUtils.smoothstep(progress, 0, TURN_END));
        // Aim point capped inside maxDistance, or the controls would yank the camera toward it
        controlsRef.current.target
          .copy(aimDir)
          .applyQuaternion(_scratchTurn)
          .multiplyScalar(Math.min(reach, 400))
          .add(camera.position);
        controlsRef.current.update();
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        animFrameIdRef.current = null;
        // Keep riding along with orbiting objects; WASD hands control back to the user
        if (target.orbit && trackedNode) {
          followRef.current = trackedNode;
          lastFollowPosRef.current.copy(_scratchCurrentTargetPos);
        }
        setIsAnimating(false);
        if (onComplete) onComplete();
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [target, camera, scene, onComplete, setLookMode]);

  // Telescope zoom while a nebula's panel is open, plus a slight widening at boost speed
  useFrame((_, delta) => {
    const boosting = THREE.MathUtils.clamp(
      (velocityRef.current.length() - CRUISE_SPEED) / (CRUISE_SPEED * (BOOST - 1)),
      0,
      1
    );
    const fov = (selected?.type === "nebula" ? selected.size * 1.25 : baseFov) + BOOST_FOV * boosting;
    if (Math.abs(camera.fov - fov) < 0.01) return;
    camera.fov = THREE.MathUtils.damp(camera.fov, fov, 3, delta);
    camera.updateProjectionMatrix();
  });

  // Game-style flight: momentum, fly where you look, and a soft edge instead of a wall.
  // Camera and aim point always move together, so no controls.update() is needed (drei's own loop runs it)
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05); // clamped so a backgrounded tab doesn't fling the camera
    const keys = keysRef.current;
    const velocity = velocityRef.current;

    // Shift camera + aim point by the target's movement, so the user's framing and orbit-drag are kept
    if (followRef.current) {
      followRef.current.getWorldPosition(_scratchFollowPos);
      _scratchFollowDelta.subVectors(_scratchFollowPos, lastFollowPosRef.current);
      lastFollowPosRef.current.copy(_scratchFollowPos);
      camera.position.add(_scratchFollowDelta);
      controls.target.add(_scratchFollowDelta);
    }

    // Wanted direction from the camera's axes: W/S along the view (pitch included), A/D strafe, Q/E down/up
    _scratchWish.set(0, 0, 0);
    if (enabled) {
      _scratchForward.setFromMatrixColumn(camera.matrixWorld, 2).negate();
      _scratchRight.setFromMatrixColumn(camera.matrixWorld, 0);
      _scratchUp.setFromMatrixColumn(camera.matrixWorld, 1);
      if (keys.w) _scratchWish.add(_scratchForward);
      if (keys.s) _scratchWish.sub(_scratchForward);
      if (keys.d) _scratchWish.add(_scratchRight);
      if (keys.a) _scratchWish.sub(_scratchRight);
      if (keys.e) _scratchWish.add(_scratchUp);
      if (keys.q) _scratchWish.sub(_scratchUp);
    }
    const steering = _scratchWish.lengthSq() > 0;

    if (steering) {
      followRef.current = null; // manual flight stops following
      setLookMode(true);
      if (isAnimating) {
        // Taking the controls mid-flight keeps the flight's momentum instead of stopping dead
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
        setIsAnimating(false);
        velocity
          .subVectors(camera.position, lastCamPosRef.current)
          .divideScalar(dt)
          .clampLength(0, CRUISE_SPEED * BOOST);
      }
      _scratchWish.normalize().multiplyScalar(CRUISE_SPEED * (keys.shift ? BOOST : 1));
    } else if (isAnimating) {
      lastCamPosRef.current.copy(camera.position); // the fly-to drives the camera
      return;
    }

    // Ease toward the wanted velocity, or coast to a stop with no input (frame-rate independent)
    velocity.lerp(_scratchWish, 1 - Math.exp(-(steering ? ACCEL : GLIDE) * dt));
    if (!steering && velocity.lengthSq() < 0.01) velocity.set(0, 0, 0);

    if (velocity.lengthSq() > 0) {
      _scratchStep.copy(velocity).multiplyScalar(dt);
      camera.position.add(_scratchStep);
      controls.target.add(_scratchStep);

      // Soft edge: past movementRadius, drop the outward speed and ease back inside instead of snapping
      const len = camera.position.length();
      if (len > movementRadius) {
        _scratchNormal.copy(camera.position).divideScalar(len);
        const outward = velocity.dot(_scratchNormal);
        if (outward > 0) velocity.addScaledVector(_scratchNormal, -outward);
        const pull = (len - movementRadius) * (1 - Math.exp(-3 * dt));
        camera.position.addScaledVector(_scratchNormal, -pull);
        controls.target.addScaledVector(_scratchNormal, -pull);
      }
    }
    lastCamPosRef.current.copy(camera.position);
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={enabled && !isAnimating}
        enableZoom={enabled && !freeLook}
        enablePan={enabled && !freeLook}
        enableRotate={enabled}
        zoomSpeed={0.8}
        panSpeed={0.8}
        rotateSpeed={0.4}
        // Free-look keeps the pivot right ahead; nebula size is degrees of sky, not world units
        minDistance={
          freeLook ? 0 : target && target.type !== "nebula" ? Math.max(15, (target.size || 5) * 1.3) : 15
        }
        maxDistance={500}
      />
    </>
  );
}

export default CameraController;
