import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import * as THREE from "three";
import "./App.css";

function Unicorn({ fistCount, handPosition }) {
  const scale = fistCount >= 1 ? 1.2 : 1;

  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      <group position={[handPosition.x, handPosition.y, 0]} scale={scale}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>

        <mesh position={[0.85, 0.55, 0]}>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial color="#fff7ff" roughness={0.35} />
        </mesh>

        <mesh position={[1.08, 1.0, 0]} rotation={[0, 0, -0.45]}>
          <coneGeometry args={[0.14, 0.6, 32]} />
          <meshStandardMaterial color="#ffd700" metalness={0.4} roughness={0.2} />
        </mesh>

        <mesh position={[0.6, 0.95, 0.22]} rotation={[0.2, 0, 0.5]}>
          <coneGeometry args={[0.12, 0.32, 24]} />
          <meshStandardMaterial color="#ffb6d9" />
        </mesh>

        <mesh position={[0.6, 0.95, -0.22]} rotation={[-0.2, 0, 0.5]}>
          <coneGeometry args={[0.12, 0.32, 24]} />
          <meshStandardMaterial color="#ffb6d9" />
        </mesh>

        {[-0.38, 0.38].map((z) =>
          [-0.35, 0.35].map((x) => (
            <mesh key={`${x}-${z}`} position={[x, -0.75, z]}>
              <cylinderGeometry args={[0.11, 0.13, 0.75, 24]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))
        )}

        <mesh position={[-0.78, 0.15, 0]} rotation={[0, 0, 1.2]}>
          <coneGeometry args={[0.2, 0.7, 32]} />
          <meshStandardMaterial color="#ff78d2" />
        </mesh>

        <mesh position={[1.19, 0.62, 0.18]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      </group>
    </Float>
  );
}

function RainbowEffect({ active, handPosition }) {
  if (!active) return null;

  const colors = ["#ff3b3b", "#ff9f1c", "#ffea00", "#4ade80", "#38bdf8", "#8b5cf6"];

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
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
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

function Scene({ fistCount, handPosition }) {
  return (
    <Canvas camera={{ position: [0, 1.2, 5], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <Environment preset="sunset" />

      <Unicorn fistCount={fistCount} handPosition={handPosition} />
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

  const [cameraReady, setCameraReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [fistCount, setFistCount] = useState(0);
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

  function getHandPosition(landmarks) {
    const wrist = landmarks[0];

    const x = (wrist.x - 0.5) * 4.2;
    const y = -(wrist.y - 0.5) * 2.8;

    return {
      x: Math.max(-2.1, Math.min(2.1, x)),
      y: Math.max(-1.3, Math.min(1.3, y)),
    };
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

   return `Kamera açılamadı: ${error?.name || "Bilinmeyen hata"} - ${error?.message || ""}`;
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

    handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });

    setStatus("Hazır! Tek yumruk = gökkuşağı, iki yumruk = yıldızlar ✨");

    detectLoop();
  } catch (error) {
    console.error(error);

    if (error?.name === "NotAllowedError") {
      setStatus("Kamera izni reddedildi. Tarayıcı kamera iznini aç.");
    } else if (error?.name === "NotFoundError") {
      setStatus("Kamera bulunamadı.");
    } else if (error?.name === "NotReadableError") {
      setStatus("Kamera başka bir sekme veya uygulama tarafından kullanılıyor olabilir.");
    } else {
      setStatus(`Hata: ${error?.name || "Bilinmeyen hata"} - ${error?.message || ""}`);
    }

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
        setFistCount(detectedFists);

        setHandPosition(getHandPosition(hands[0]));

        if (detectedFists >= 2) {
          setStatus("İki yumruk algılandı! Gökkuşağı + yıldızlar aktif ✨🌈");
        } else if (detectedFists === 1) {
          setStatus("Bir yumruk algılandı! Gökkuşağı aktif 🌈");
        } else {
          setStatus("Elini yumruk yaparsan gökkuşağı çıkacak 🌈");
        }
      } else {
        setFistCount(0);
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
        <Scene fistCount={fistCount} handPosition={handPosition} />
      </div>

      <div className="hud">
        <h1>Unicorn Gesture AR</h1>
        <p>{status}</p>

        <div className={fistCount > 0 ? "badge active" : "badge"}>
          {fistCount >= 2
            ? "2 yumruk algılandı ✨🌈"
            : fistCount === 1
            ? "1 yumruk algılandı 🌈"
            : cameraReady
            ? "El bekleniyor ✋"
            : "Kamera kapalı"}
        </div>

        {!cameraReady && (
          <button className="start-button" onClick={startCamera} disabled={isStarting}>
            {isStarting ? "Başlatılıyor..." : "Kamerayı Başlat"}
          </button>
        )}
      </div>

      {!cameraReady && started && <div className="loading">Kamera yükleniyor...</div>}
    </main>
  );
}