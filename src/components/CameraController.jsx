import React, { useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function CameraController({ target, onComplete, movementRadius = 290, enabled = true }) {
  const { camera, scene } = useThree();
  const controlsRef = useRef();
  const [isAnimating, setIsAnimating] = useState(false);
  const keysRef = useRef({});
  const velocityRef = useRef(new THREE.Vector3());
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

  React.useEffect(() => {
    if (target && controlsRef.current) {
      setIsAnimating(true);

      const distance = 50;
      const targetPos = new THREE.Vector3(...target.position);
      let actualTargetPos = new THREE.Vector3(...target.position);
      const currentPos = camera.position.clone();

      if (target.type === "nebula") {
        scene.traverse((child) => {
          if (child.userData && child.userData.objectId === target.id) {
            child.getWorldPosition(actualTargetPos);
          }
        });
      }

      const offset = new THREE.Vector3(20, 15, distance);
      targetOffsetRef.current.copy(offset);
      const newCameraPos = actualTargetPos.clone().add(offset);

      const startPos = currentPos.clone();
      const startTarget = controlsRef.current.target.clone();

      let progress = 0;
      const duration = 2000; // 2 seconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);

        // Use easing function for smooth animation
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

        // For nebulas, update target position during animation to follow the floating motion
        let currentTargetPos = actualTargetPos;
        if (target.type === "nebula") {
          scene.traverse((child) => {
            if (child.userData && child.userData.objectId === target.id) {
              currentTargetPos = new THREE.Vector3();
              child.getWorldPosition(currentTargetPos);
            }
          });
        }

        // Interpolate camera position
        const dynamicCameraPos = currentTargetPos
          .clone()
          .add(targetOffsetRef.current);
        camera.position.lerpVectors(startPos, dynamicCameraPos, eased);

        // Interpolate camera target (what it's looking at)
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(
            startTarget,
            currentTargetPos,
            eased
          );
          controlsRef.current.update();
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          if (onComplete) onComplete();
        }
      };

      animate();
    }
  }, [target, camera]);

  // WASD movement integrated with OrbitControls aim point
  useFrame(() => {
    if (!enabled || !controlsRef.current || isAnimating) {
      lastFrameRef.current = performance.now();
      return;
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000); // clamp delta
    lastFrameRef.current = now;

    const speedBase = 80; // units per second (increased from 40)
    const boost = keysRef.current["shift"] ? 2.2 : 1;
    const speed = speedBase * boost;

    // Direction vectors from camera - use camera's matrix for reliable directions
    const cameraMatrix = camera.matrixWorld;
    const right = new THREE.Vector3().setFromMatrixColumn(cameraMatrix, 0); // camera's X axis (right)
    const forward = new THREE.Vector3()
      .setFromMatrixColumn(cameraMatrix, 2)
      .negate(); // camera's -Z axis (forward)

    // Keep movement level (no vertical component)
    right.y = 0;
    forward.y = 0;
    right.normalize();
    forward.normalize();
    let moved = false;
    const moveVec = new THREE.Vector3();
    if (keysRef.current["w"]) {
      moveVec.add(forward);
      moved = true;
    }
    if (keysRef.current["s"]) {
      moveVec.sub(forward);
      moved = true;
    }
    if (keysRef.current["a"]) {
      moveVec.sub(right); // A = move left (subtract right vector)
      moved = true;
    }
    if (keysRef.current["d"]) {
      moveVec.add(right); // D = move right (add right vector)
      moved = true;
    }
    if (!moved) return;

    moveVec.normalize().multiplyScalar(speed * dt);

    // Move both camera and OrbitControls target to translate through space
    camera.position.add(moveVec);
    if (controlsRef.current) {
      controlsRef.current.target.add(moveVec);
      controlsRef.current.update();
    }

    // Boundary clamp (stay within movementRadius sphere)
    const len = camera.position.length();
    if (len > movementRadius) {
      camera.position.setLength(movementRadius);
      // Keep target at same relative offset
      const toTarget = new THREE.Vector3().subVectors(
        controlsRef.current.target,
        camera.position
      );
      if (toTarget.length() > 600) {
        // Safety clamp on extreme offsets
        toTarget.setLength(600);
        controlsRef.current.target.copy(camera.position).add(toTarget);
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
        minDistance={20}
        maxDistance={400}
      />
    </>
  );
}

export default CameraController;
