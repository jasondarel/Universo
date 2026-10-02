import React, { useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Reusable scratch vectors to avoid per-frame heap allocations during flight & animation
const _scratchRight = new THREE.Vector3();
const _scratchForward = new THREE.Vector3();
const _scratchMove = new THREE.Vector3();
const _scratchToTarget = new THREE.Vector3();
const _scratchDynamicCamPos = new THREE.Vector3();
const _scratchCurrentTargetPos = new THREE.Vector3();
const _scratchFollowPos = new THREE.Vector3();
const _scratchFollowDelta = new THREE.Vector3();
const _scratchTurn = new THREE.Quaternion();

function CameraController({ target, selected, onComplete, movementRadius = 290, enabled = true }) {
  const { camera, scene } = useThree();
  const controlsRef = useRef();
  const [isAnimating, setIsAnimating] = useState(false);
  const [baseFov] = useState(camera.fov);
  const animFrameIdRef = useRef(null);
  const keysRef = useRef({});
  const targetOffsetRef = useRef(new THREE.Vector3());
  const lastFrameRef = useRef(performance.now());
  // Orbiting target the camera keeps riding along with after arrival (null = not following)
  const followRef = useRef(null);
  const lastFollowPosRef = useRef(new THREE.Vector3());

  // Input handlers
  useEffect(() => {
    const down = (e) => {
      if (!enabled) return;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);

  useEffect(() => {
    // Cancel any ongoing animation loop before starting a new one
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    followRef.current = null;

    if (!target || !controlsRef.current) return;

    setIsAnimating(true);

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

    const actualTargetPos = new THREE.Vector3(...target.position);
    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();

    // Backdrop nebulae follow the camera, so a flight would never arrive: turn in place to face them instead
    const isBackdrop = target.type === "nebula";
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

    // Proportional offset vectors so the object is beautifully framed without clipping
    targetOffsetRef.current.set(distance * 0.35, distance * 0.22, distance);

    let progress = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

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

        // Interpolate camera position
        _scratchDynamicCamPos.copy(_scratchCurrentTargetPos).add(targetOffsetRef.current);
        camera.position.lerpVectors(startPos, _scratchDynamicCamPos, eased);

        // Interpolate camera target
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(
            startTarget,
            _scratchCurrentTargetPos,
            eased
          );
          controlsRef.current.update();
        }
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
  }, [target, camera, scene, onComplete]);

  // Telescope zoom while a nebula's panel is open, back to the normal view otherwise
  useFrame((_, delta) => {
    const fov = selected?.type === "nebula" ? selected.size * 1.25 : baseFov;
    if (Math.abs(camera.fov - fov) < 0.01) return;
    camera.fov = THREE.MathUtils.damp(camera.fov, fov, 3, delta);
    camera.updateProjectionMatrix();
  });

  // WASD movement integrated with OrbitControls aim point
  useFrame(() => {
    if (!enabled || !controlsRef.current || isAnimating) {
      lastFrameRef.current = performance.now();
      return;
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000); // clamp delta
    lastFrameRef.current = now;

    // Shift camera + aim point by the target's movement, so the user's framing and orbit-drag are kept.
    // No controls.update() needed: both moved equally, so the view direction is unchanged
    if (followRef.current) {
      followRef.current.getWorldPosition(_scratchFollowPos);
      _scratchFollowDelta.subVectors(_scratchFollowPos, lastFollowPosRef.current);
      lastFollowPosRef.current.copy(_scratchFollowPos);
      camera.position.add(_scratchFollowDelta);
      controlsRef.current.target.add(_scratchFollowDelta);
    }

    const speedBase = 80; // units per second
    const boost = keysRef.current["shift"] ? 2.2 : 1;
    const speed = speedBase * boost;

    // Direction vectors from camera matrix - reuse pre-allocated scratch vectors
    const cameraMatrix = camera.matrixWorld;
    _scratchRight.setFromMatrixColumn(cameraMatrix, 0); // camera's X axis (right)
    _scratchForward.setFromMatrixColumn(cameraMatrix, 2).negate(); // camera's -Z axis (forward)

    // Keep movement level (no vertical component)
    _scratchRight.y = 0;
    _scratchForward.y = 0;
    _scratchRight.normalize();
    _scratchForward.normalize();

    _scratchMove.set(0, 0, 0);
    let moved = false;
    if (keysRef.current["w"]) {
      _scratchMove.add(_scratchForward);
      moved = true;
    }
    if (keysRef.current["s"]) {
      _scratchMove.sub(_scratchForward);
      moved = true;
    }
    if (keysRef.current["a"]) {
      _scratchMove.sub(_scratchRight); // A = move left
      moved = true;
    }
    if (keysRef.current["d"]) {
      _scratchMove.add(_scratchRight); // D = move right
      moved = true;
    }
    if (!moved) return;
    followRef.current = null; // manual flight stops following

    _scratchMove.normalize().multiplyScalar(speed * dt);

    // Move both camera and OrbitControls target to translate through space
    camera.position.add(_scratchMove);
    if (controlsRef.current) {
      controlsRef.current.target.add(_scratchMove);
      controlsRef.current.update();
    }

    // Boundary clamp (stay within movementRadius sphere)
    const len = camera.position.length();
    if (len > movementRadius) {
      camera.position.setLength(movementRadius);
      // Keep target at same relative offset
      _scratchToTarget.subVectors(controlsRef.current.target, camera.position);
      if (_scratchToTarget.length() > 600) {
        _scratchToTarget.setLength(600);
        controlsRef.current.target.copy(camera.position).add(_scratchToTarget);
      }
      controlsRef.current.update();
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={enabled && !isAnimating}
        enableZoom={enabled}
        enablePan={enabled}
        enableRotate={enabled}
        zoomSpeed={0.8}
        panSpeed={0.8}
        rotateSpeed={0.4}
        // Nebula size is degrees of sky, not world units
        minDistance={target && target.type !== "nebula" ? Math.max(15, (target.size || 5) * 1.3) : 15}
        maxDistance={500}
      />
    </>
  );
}

export default CameraController;
