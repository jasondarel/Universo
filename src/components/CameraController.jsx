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

function CameraController({ target, onComplete, movementRadius = 290, enabled = true }) {
  const { camera, scene } = useThree();
  const controlsRef = useRef();
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameIdRef = useRef(null);
  const keysRef = useRef({});
  const targetOffsetRef = useRef(new THREE.Vector3());
  const lastFrameRef = useRef(performance.now());

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

    if (!target || !controlsRef.current) return;

    setIsAnimating(true);

    // Calculate optimal camera framing distance dynamically based on object size & type
    const objectSize = target.size || 8;
    let distance = Math.max(38, objectSize * 3.2);

    if (target.hasRings) {
      // Planetary rings extend up to 3.2x planet size
      distance = Math.max(distance, objectSize * 5.5);
    } else if (target.type === "nebula") {
      // Nebulas have diffuse gas boundaries
      distance = Math.max(distance, objectSize * 3.8);
    } else if (target.name && (target.name.includes("Sun") || target.name.includes("Sol"))) {
      // Sol is size 30; frame at a comfortable distance so it doesn't overflow screen
      distance = 115;
    }

    const actualTargetPos = new THREE.Vector3(...target.position);
    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();

    // If targeting a nebula, find the root node ONCE rather than traversing the whole scene every frame
    let nebulaRootNode = null;
    if (target.type === "nebula") {
      scene.traverse((child) => {
        if (
          !nebulaRootNode &&
          child.userData &&
          child.userData.objectId === target.id &&
          child.userData.isNebulaRoot
        ) {
          nebulaRootNode = child;
          child.getWorldPosition(actualTargetPos);
        }
      });
    }

    // Proportional offset vectors so the object is beautifully framed without clipping
    const offsetX = distance * 0.35;
    const offsetY = distance * 0.22;
    const offsetZ = distance;
    targetOffsetRef.current.set(offsetX, offsetY, offsetZ);

    let progress = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      progress = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      // Follow floating motion for nebulas via cached node reference
      if (nebulaRootNode) {
        nebulaRootNode.getWorldPosition(_scratchCurrentTargetPos);
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

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        animFrameIdRef.current = null;
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

  // WASD movement integrated with OrbitControls aim point
  useFrame(() => {
    if (!enabled || !controlsRef.current || isAnimating) {
      lastFrameRef.current = performance.now();
      return;
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000); // clamp delta
    lastFrameRef.current = now;

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
        minDistance={target ? Math.max(15, (target.size || 5) * 1.3) : 15}
        maxDistance={500}
      />
    </>
  );
}

export default CameraController;
