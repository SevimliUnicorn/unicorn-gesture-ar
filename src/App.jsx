import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import "./App.css";

function Unicorn({ fistCount, handPosition, isPointing, unicornRotation }) {
  const groupRef = useRef();
  const { scene, animations } = useGLTF("/models/unicorn.glb");
  const { actions, names } = useAnimations(animations, groupRef);

  const scale = fistCount >= 1 ? 0.18 : 0.15;

  useEffect(() => {
    if (!names.length) return;

    console.log("Unicorn animations:", names);

    const runAnimation =
      actions["Run"] ||
      actions["Running"] ||
      actions["Walk"] ||
      actions["Walking"] ||
      actions[names[0]];

    if (!runAnimation) return;

    if (isPointing) {
      runAnimation.reset().fadeIn(0.2).play();
    } else {
      runAnimation.fadeOut(0.2);

      const stopTimer = setTimeout(() => {
        runAnimation.stop();
      }, 220);

      return () => clearTimeout(stopTimer);
    }
  }, [actions, names, isPointing]);

  return (
    <Float speed={2.2} rotationIntensity={0.25} floatIntensity={0.45}>
      <group
        ref={groupRef}
        position={[handPosition.x, handPosition.y - 0.05, 0]}
        scale={[scale, scale, scale]}
        rotation={[0, Math.PI / 2 + unicornRotation, 0]}
      >
        <primitive object={scene} position={[0, -1.2, 0]} />
      </group>
    </Float>
  );
}

useGLTF.preload("/models/unicorn.glb");

function RainbowEffect({ active, handPosition }) {
  if (!active) return null;

  const colors = [
    "#ff3b3b",
    "#ff9f1c",
    "#ffea00",
    "#4ade80",
    "#38bdf8",
    "#8b5cf6",
  ];

  return (
    <group position={[handPosition.x, handPosition.y - 0.15, -0.4]}>
      {colors.map((color, index) => (
        <mesh
          key={color}
          position={[0, index * 0.04, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1 + index * 0.08, 1 + index * 0.08, 1]}
        >
          <torusGeometry args={[1.05, 0.025, 12, 80, Math.PI]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function StarsEffect({ active, handPosition }) {
  const refs = useRef([]);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outer = 0.14;
    const inner = 0.06;

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outer : inner;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    shape.closePath();
    return shape;
  }, []);

  const stars = useMemo(
    () => [
      [-1.1, 1.05, 1],
      [-0.65, 1.35, 0.8],
      [-0.15, 1.2, 1.1],
      [0.45, 1.35, 0.85],
      [1.0, 1.0, 1],
      [-1.2, 0.35, 0.75],
      [1.2, 0.35, 0.75],
      [-0.4, 0.55, 0.65],
      [0.55, 0.62, 0.7],
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!active) return;

    refs.current.forEach((star, index) => {
      if (!star) return;

      const t = clock.elapsedTime * (2.2 + index * 0.25);
      const pulse = 0.55 + Math.abs(Math.sin(t)) * 0.85;

      star.scale.setScalar(stars[index][2] * pulse);
      star.rotation.z += 0.025;

      if (star.material) {
        star.material.opacity = 0.35 + Math.abs(Math.sin(t)) * 0.65;
        star.material.emissiveIntensity = 0.8 + Math.abs(Math.sin(t)) * 1.8;
      }
    });
  });

  if (!active) return null;

  return (
    <group position={[handPosition.x, handPosition.y, 0.2]}>
      {stars.map((star, index) => (
        <mesh
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          position={[star[0], star[1], 0]}
        >
          <shapeGeometry args={[starShape]} />
          <meshStandardMaterial
            color="#fff7a8"
            emissive="#fff0a8"
            emissiveIntensity={1}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ fistCount, handPosition, isPointing, unicornRotation }) {
  return (
    <Canvas camera={{ position: [0, 1.2, 5], fov: 45 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-3, 2, 3]} intensity={0.7} />
      <Environment preset="sunset" />

      <Suspense fallback={null}>
        <Unicorn
          fistCount={fistCount}
          handPosition={handPosition}
          isPointing={isPointing}
          unicornRotation={unicornRotation}
        />
      </Suspense>

      <RainbowEffect active={fistCount >= 1} handPosition={handPosition} />
      <StarsEffect active={fistCount >= 2} handPosition={handPosition} />

      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const previousPointAngleRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [fistCount, setFistCount] = useState(0);
  const [isPointing, setIsPointing] = useState(false);
  const [unicornRotation, setUnicornRotation] = useState(0);
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("Başlamak için kamerayı aç.");

  function detectFist(landmarks) {
    if (!landmarks) return false;

    const fingers = [
      { tip: 8, pip: 6 },
      { tip: 12, pip: 10 },
      { tip: 16, pip: 14 },
      { tip: 20, pip: 18 },
    ];

    let foldedCount = 0;

    fingers.forEach((finger) => {
      if (landmarks[finger.tip].y > landmarks[finger.pip].y) {
        foldedCount++;
      }
    });

    return foldedCount >= 3;
  }

  function detectIndexPointing(landmarks) {
    if (!landmarks) return false;

    const indexUp = landmarks[8].y < landmarks[6].y;
    const middleFolded = landmarks[12].y > landmarks[10].y;
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    return indexUp && middleFolded && ringFolded && pinkyFolded;
  }

  function getHandPosition(landmarks) {
    const wrist = landmarks[0];

    const x = -(wrist.x - 0.5) * 4.2;
    const y = -(wrist.y - 0.5) * 2.8;

    return {
      x: Math.max(-2.1, Math.min(2.1, x)),
      y: Math.max(-1.3, Math.min(1.3, y)),
    };
  }

  function getPointingAngle(landmarks) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // Kamera görüntüsü aynalı olduğu için X koordinatını tersliyoruz.
    const wristX = 1 - wrist.x;
    const indexX = 1 - indexTip.x;

    const dx = indexX - wristX;
    const dy = indexTip.y - wrist.y;

    return Math.atan2(dy, dx);
  }

  function normalizeAngleDelta(delta) {
    if (delta > Math.PI) return delta - Math.PI * 2;
    if (delta < -Math.PI) return delta + Math.PI * 2;
    return delta;
  }

  function updateUnicornRotationFromFinger(landmarks, pointing) {
    if (!pointing) {
      previousPointAngleRef.current = null;
      return;
    }

    const currentAngle = getPointingAngle(landmarks);

    if (previousPointAngleRef.current === null) {
      previousPointAngleRef.current = currentAngle;
      return;
    }

    const delta = normalizeAngleDelta(
      currentAngle - previousPointAngleRef.current
    );

    previousPointAngleRef.current = currentAngle;

    // Eğer yön ters gelirse buradaki + işaretini - yaparız.
    setUnicornRotation((prev) => prev + delta * 1.6);
  }

  function getCameraErrorMessage(error) {
    if (!window.isSecureContext) {
      return "Kamera için HTTPS gerekiyor. Vercel linkiyle açtığından emin ol.";
    }

    if (error?.name === "NotAllowedError") {
      return "Kamera izni reddedildi. iPhone Ayarlar > Safari > Kamera kısmını kontrol et.";
    }

    if (error?.name === "NotFoundError") {
      return "Kamera bulunamadı.";
    }

    if (error?.name === "NotReadableError") {
      return "Kamera başka bir uygulama tarafından kullanılıyor olabilir.";
    }

    return `Kamera açılamadı: ${error?.name || "Bilinmeyen hata"} - ${
      error?.message || ""
    }`;
  }

  async function startCamera() {
    if (isStarting || cameraReady) return;

    try {
      setIsStarting(true);
      setStarted(true);
      setStatus("Kamera izni bekleniyor...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      setCameraReady(true);
      setStatus("Kamera açıldı. El algılama modeli yükleniyor...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );

      setStatus("Hazır! İşaret parmağınla koştur, yumrukla efekt çıkar ✨");

      detectLoop();
    } catch (error) {
      console.error(error);
      setStatus(getCameraErrorMessage(error));
      setStarted(false);
    } finally {
      setIsStarting(false);
    }
  }

  function detectLoop() {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    if (video && landmarker && video.readyState >= 2) {
      const result = landmarker.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const hands = result.landmarks;

        const detectedFists = hands.filter((hand) => detectFist(hand)).length;
        const detectedPointing = hands.some((hand) =>
          detectIndexPointing(hand)
        );

        setFistCount(detectedFists);
        setIsPointing(detectedPointing);
        setHandPosition(getHandPosition(hands[0]));

        updateUnicornRotationFromFinger(hands[0], detectedPointing);

        if (detectedFists >= 2) {
          setStatus("İki yumruk algılandı! Gökkuşağı + yıldızlar aktif ✨🌈");
        } else if (detectedFists === 1) {
          setStatus("Bir yumruk algılandı! Gökkuşağı aktif 🌈");
        } else if (detectedPointing) {
          setStatus("İşaret parmağı algılandı! Unicorn koşuyor ve dönüyor 🦄💨");
        } else {
          setStatus("İşaret parmağını kaldırırsan unicorn koşacak 🦄");
        }
      } else {
        setFistCount(0);
        setIsPointing(false);
        previousPointAngleRef.current = null;
        setStatus("Elini kameraya göster.");
      }
    }

    animationRef.current = requestAnimationFrame(detectLoop);
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <main className="app">
      <video
        ref={videoRef}
        className="camera"
        playsInline
        muted
        autoPlay
      />

      <div className="scene-layer">
        <Scene
          fistCount={fistCount}
          handPosition={handPosition}
          isPointing={isPointing}
          unicornRotation={unicornRotation}
        />
      </div>

      <div className="hud">
        <h1>Unicorn Gesture AR</h1>
        <p>{status}</p>

        <div className={fistCount > 0 || isPointing ? "badge active" : "badge"}>
          {fistCount >= 2
            ? "2 yumruk algılandı ✨🌈"
            : fistCount === 1
            ? "1 yumruk algılandı 🌈"
            : isPointing
            ? "Unicorn koşuyor 🦄💨"
            : cameraReady
            ? "El bekleniyor ✋"
            : "Kamera kapalı"}
        </div>

        {!cameraReady && (
          <button
            className="start-button"
            onClick={startCamera}
            disabled={isStarting}
          >
            {isStarting ? "Başlatılıyor..." : "Kamerayı Başlat"}
          </button>
        )}
      </div>

      {!cameraReady && started && (
        <div className="loading">Kamera yükleniyor...</div>
      )}
    </main>
  );
}