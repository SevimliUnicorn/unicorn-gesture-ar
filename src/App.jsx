import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import {
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import * as THREE from "three";
import * as faceapi from "face-api.js";
import "./App.css";

const FRIENDS = [
  {
    id: "seyma",
    name: "Şeyma",
    images: [
      "/faces/seyma/1.jpg",
      "/faces/seyma/2.jpg",
      "/faces/seyma/3.jpg",
    ],
    song: "/sounds/seyma.mp3",
    message: "Şeyma sahneye giriş yaptı ✨👑",
    effect: "hearts",
  },
  {
    id: "onur",
    name: "Onur",
    images: ["/faces/onur/1.jpg", "/faces/onur/2.jpg", "/faces/onur/3.jpg"],
    song: "/sounds/onur.mp3",
    message: "Onur hoş geldin 😎",
    effect: "hearts",
  },
  {
  id: "furkan",
  name: "Furkan",
  images: [
    "/faces/furkan/1.jpg",
    "/faces/furkan/2.jpg",
    "/faces/furkan/3.jpg",
  ],
  song: "/sounds/furkan.mp3",
  sleepSong: "/sounds/furkan-alarm.mp3",
  message: "Furkan geldi 🦄",
  effect: "sparkles",
  },
];

function Unicorn({
  fistCount,
  handPosition,
  isPointing,
  unicornRotation,
  hideUnicorn,
}) {
  const groupRef = useRef();
  const { scene, animations } = useGLTF("/models/unicorn.glb");
  const { actions, names } = useAnimations(animations, groupRef);

  const scale = fistCount >= 1 ? 0.18 : 0.15;

  useEffect(() => {
    if (!names.length) return;

    const runAnimation =
      actions["Run"] ||
      actions["Running"] ||
      actions["Walk"] ||
      actions["Walking"] ||
      actions[names[0]];

    if (!runAnimation) return;

    if (isPointing && !hideUnicorn) {
      runAnimation.reset().fadeIn(0.2).play();
    } else {
      runAnimation.fadeOut(0.2);

      const stopTimer = setTimeout(() => {
        runAnimation.stop();
      }, 220);

      return () => clearTimeout(stopTimer);
    }
  }, [actions, names, isPointing, hideUnicorn]);

  if (hideUnicorn) return null;

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

function FriendEffect({ friend }) {
  if (!friend) return null;

  const emojis =
    friend.effect === "hearts"
      ? ["💖", "💘", "💗", "💕", "💞", "✨"]
      : ["✨", "⭐", "🌟", "🦄", "💫", "🎉"];

  return (
    <div className="friend-effect">
      {emojis.map((emoji, index) => (
        <span
          key={`${emoji}-${index}`}
          style={{
            left: `${12 + index * 15}%`,
            animationDelay: `${index * 0.18}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

function Scene({
  fistCount,
  handPosition,
  isPointing,
  unicornRotation,
  hideUnicorn,
  hideEffects,
}) {
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
          hideUnicorn={hideUnicorn}
        />
      </Suspense>

      <RainbowEffect
        active={!hideEffects && fistCount >= 1}
        handPosition={handPosition}
      />
      <StarsEffect
        active={!hideEffects && fistCount >= 2}
        handPosition={handPosition}
      />

      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const recognitionCanvasRef = useRef(null);

  const handLandmarkerRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  const previousPointAngleRef = useRef(null);
  const eyesClosedStartRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const alarmAudioRef = useRef(null);

  const faceMatcherRef = useRef(null);
  const faceRecognitionReadyRef = useRef(false);
  const recognitionFrameRef = useRef(0);
  const lastRecognitionAtRef = useRef(0);
  const friendAudioRef = useRef(null);
  const friendMessageTimeoutRef = useRef(null);
  const currentFriendIdRef = useRef(null);

  const nahAudioRef = useRef(null);
  const nahTimeoutRef = useRef(null);
  const nahCooldownRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [fistCount, setFistCount] = useState(0);
  const [isPointing, setIsPointing] = useState(false);
  const [unicornRotation, setUnicornRotation] = useState(0);
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("Başlamak için kamerayı aç.");

  const [sleepProgress, setSleepProgress] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);

  const [faceRecognitionReady, setFaceRecognitionReady] = useState(false);
  const [recognizedFriend, setRecognizedFriend] = useState(null);

  const [nahActive, setNahActive] = useState(false);

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

  function detectNahGesture(landmarks) {
    if (!landmarks) return false;

    const indexFolded = landmarks[8].y > landmarks[6].y;
    const middleUp = landmarks[12].y < landmarks[10].y;
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    return middleUp && indexFolded && ringFolded && pinkyFolded;
  }

  function stopAllSoundsExceptNah() {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }

    if (friendAudioRef.current) {
      friendAudioRef.current.pause();
      friendAudioRef.current.currentTime = 0;
    }

    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    setAlarmActive(false);

    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  function triggerNahReaction() {
    const now = performance.now();

    if (now - nahCooldownRef.current < 4000) return;

    nahCooldownRef.current = now;

    stopAllSoundsExceptNah();

    setNahActive(true);
    setStatus("DENEYECEĞİNİ BİLİYORDUM TERBİYESİZ 😤");

    if (nahAudioRef.current) {
      nahAudioRef.current.pause();
      nahAudioRef.current.currentTime = 0;

      nahAudioRef.current
        .play()
        .catch((error) => console.error("Nah sesi çalınamadı:", error));
    }

    if (navigator.vibrate) {
      navigator.vibrate([180, 80, 180, 80, 260]);
    }

    if (nahTimeoutRef.current) {
      clearTimeout(nahTimeoutRef.current);
    }

    nahTimeoutRef.current = setTimeout(() => {
      setNahActive(false);

      if (nahAudioRef.current) {
        nahAudioRef.current.pause();
        nahAudioRef.current.currentTime = 0;
      }

      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    }, 3000);
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

    setUnicornRotation((prev) => prev + delta * 1.6);
  }

  function detectEyesClosed(faceResult) {
    const blendshapes = faceResult?.faceBlendshapes?.[0]?.categories;

    if (!blendshapes) return false;

    const leftBlink =
      blendshapes.find((item) => item.categoryName === "eyeBlinkLeft")?.score ||
      0;

    const rightBlink =
      blendshapes.find((item) => item.categoryName === "eyeBlinkRight")
        ?.score || 0;

    return leftBlink > 0.45 && rightBlink > 0.45;
  }

  function startAlarm() {
  setAlarmActive(true);

  if (friendAudioRef.current) {
    friendAudioRef.current.pause();
    friendAudioRef.current.currentTime = 0;
  }

  const currentFriend = FRIENDS.find(
    (friend) => friend.id === currentFriendIdRef.current
  );

  const alarmSource =
    currentFriend?.id === "furkan"
      ? "/sounds/furkan-alarm.mp3"
      : "/sounds/alarm.mp3";

  if (alarmAudioRef.current) {
    alarmAudioRef.current.pause();
    alarmAudioRef.current.currentTime = 0;
  }

  alarmAudioRef.current = new Audio(alarmSource);
  alarmAudioRef.current.loop = true;
  alarmAudioRef.current.volume = 0.9;

  alarmAudioRef.current
    .play()
    .catch((error) => console.error("Alarm müziği çalınamadı:", error));

  if (navigator.vibrate) {
    navigator.vibrate([300, 150, 300, 150, 500]);
  }

  if (!alarmIntervalRef.current) {
    alarmIntervalRef.current = setInterval(() => {
      if (navigator.vibrate) {
        navigator.vibrate([250, 120, 250]);
      }
    }, 900);
  }
}

  function stopAlarm() {
    setAlarmActive(false);

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }

    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    setSleepProgress(0);
  }

  function updateSleepSensor(faceResult) {
    const closed = detectEyesClosed(faceResult);
    setEyesClosed(closed);

    if (!closed) {
      eyesClosedStartRef.current = null;
      setSleepProgress(0);
      stopAlarm();
      return;
    }

    const now = performance.now();

    if (!eyesClosedStartRef.current) {
      eyesClosedStartRef.current = now;
    }

    const elapsed = now - eyesClosedStartRef.current;
    const progress = Math.min((elapsed / 5000) * 100, 100);

    setSleepProgress(progress);

    if (elapsed >= 5000 && !alarmIntervalRef.current) {
      startAlarm();
    }
  }

  async function loadFaceRecognition() {
    setStatus("Yüz tanıma modeli yükleniyor...");

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models/face-api"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models/face-api"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models/face-api"),
    ]);

    const labeledDescriptors = [];

    for (const friend of FRIENDS) {
      const descriptors = [];

      for (const imageUrl of friend.images) {
        try {
          const img = await faceapi.fetchImage(imageUrl);
          const detection = await faceapi
            .detectSingleFace(
              img,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.45,
              })
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection?.descriptor) {
            descriptors.push(detection.descriptor);
            console.log(`${friend.name} referans yüz yüklendi:`, imageUrl);
          } else {
            console.warn(`${friend.name} için yüz bulunamadı:`, imageUrl);
          }
        } catch (error) {
          console.error(
            `${friend.name} fotoğrafı yüklenemedi:`,
            imageUrl,
            error
          );
        }
      }

      if (descriptors.length > 0) {
        labeledDescriptors.push(
          new faceapi.LabeledFaceDescriptors(friend.id, descriptors)
        );
      }
    }

    if (labeledDescriptors.length > 0) {
      faceMatcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.65);
      faceRecognitionReadyRef.current = true;
      setFaceRecognitionReady(true);

      console.log(
        "Yüz tanıma hazır. Yüklenen kişiler:",
        labeledDescriptors.map((item) => item.label)
      );

      setStatus("Hazır! Arkadaş tanıma aktif ✨");
    } else {
      faceRecognitionReadyRef.current = false;
      setFaceRecognitionReady(false);
      setStatus("Yüz tanıma için referans yüz bulunamadı.");
    }
  }

  function playFriendSong(friend) {
    if (!friend) return;
    if (nahActive) return;

    if (currentFriendIdRef.current === friend.id && friendAudioRef.current) {
      return;
    }

    if (friendAudioRef.current) {
      friendAudioRef.current.pause();
      friendAudioRef.current.currentTime = 0;
    }

    currentFriendIdRef.current = friend.id;

    friendAudioRef.current = new Audio(friend.song);
    friendAudioRef.current.volume = 0.9;
    friendAudioRef.current
      .play()
      .catch((error) => console.error("Arkadaş şarkısı çalınamadı:", error));
  }

  function showFriendGreeting(friend) {
    if (nahActive) return;

    setRecognizedFriend(friend);
    setStatus(friend.message);
    playFriendSong(friend);

    if (friendMessageTimeoutRef.current) {
      clearTimeout(friendMessageTimeoutRef.current);
    }

    friendMessageTimeoutRef.current = setTimeout(() => {
      setRecognizedFriend(null);
    }, 5000);
  }

  async function runFaceRecognition(video) {
    if (!faceMatcherRef.current || !recognitionCanvasRef.current) return;

    const now = performance.now();

    if (now - lastRecognitionAtRef.current < 5000) return;

    recognitionFrameRef.current += 1;

    if (recognitionFrameRef.current % 5 !== 0) return;

    const canvas = recognitionCanvasRef.current;
    const context = canvas.getContext("2d");

    const targetWidth = 320;
    const ratio = video.videoHeight / video.videoWidth;
    const targetHeight = Math.round(targetWidth * ratio);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    const detection = await faceapi
      .detectSingleFace(
        canvas,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.35,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection?.descriptor) {
      console.log("Kamerada yüz descriptor bulunamadı.");
      return;
    }

    const bestMatch = faceMatcherRef.current.findBestMatch(
      detection.descriptor
    );

    console.log("Yüz eşleşme sonucu:", bestMatch.toString());

    if (bestMatch.label === "unknown") return;

    const friend = FRIENDS.find((item) => item.id === bestMatch.label);

    if (!friend) return;

    lastRecognitionAtRef.current = now;
    showFriendGreeting(friend);
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

      alarmAudioRef.current = new Audio("/sounds/alarm.mp3");
      alarmAudioRef.current.loop = true;
      alarmAudioRef.current.volume = 0.85;
      alarmAudioRef.current.load();

      nahAudioRef.current = new Audio("/sounds/nah.mp3");
      nahAudioRef.current.volume = 0.9;
      nahAudioRef.current.load();

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
      setStatus("Kamera açıldı. Algılama modelleri yükleniyor...");

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

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        }
      );

      await loadFaceRecognition();

      setStatus("Hazır! İşaret parmağınla koştur, arkadaş tanıma aktif ✨");

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
    const faceLandmarker = faceLandmarkerRef.current;

    if (video && landmarker && video.readyState >= 2) {
      const now = performance.now();

      const result = landmarker.detectForVideo(video, now);

      if (faceLandmarker) {
        const faceResult = faceLandmarker.detectForVideo(video, now);
        updateSleepSensor(faceResult);
      }

      if (faceRecognitionReadyRef.current && !nahActive) {
        runFaceRecognition(video);
      }

      if (result.landmarks && result.landmarks.length > 0) {
        const hands = result.landmarks;

        const detectedFists = hands.filter((hand) => detectFist(hand)).length;
        const detectedPointing = hands.some((hand) =>
          detectIndexPointing(hand)
        );
        const detectedNah = hands.some((hand) => detectNahGesture(hand));

        if (detectedNah) {
          triggerNahReaction();
        }

        setFistCount(detectedNah ? 0 : detectedFists);
        setIsPointing(detectedNah ? false : detectedPointing);
        setHandPosition(getHandPosition(hands[0]));

        if (!detectedNah && !nahActive) {
          updateUnicornRotationFromFinger(hands[0], detectedPointing);
        }

        if (nahActive || detectedNah) {
          setStatus("DENEYECEĞİNİ BİLİYORDUM TERBİYESİZ 😤");
        } else if (detectedFists >= 2) {
          setStatus("İki yumruk algılandı! Gökkuşağı + yıldızlar aktif ✨🌈");
        } else if (detectedFists === 1) {
          setStatus("Bir yumruk algılandı! Gökkuşağı aktif 🌈");
        } else if (detectedPointing) {
          setStatus("İşaret parmağı algılandı! Unicorn koşuyor ve dönüyor 🦄💨");
        } else if (recognizedFriend) {
          setStatus(recognizedFriend.message);
        } else if (eyesClosed) {
          setStatus("Gözler kapalı algılandı 😴");
        } else {
          setStatus("İşaret parmağını kaldırırsan unicorn koşacak 🦄");
        }
      } else {
        setFistCount(0);
        setIsPointing(false);
        previousPointAngleRef.current = null;

        if (nahActive) {
          setStatus("DENEYECEĞİNİ BİLİYORDUM TERBİYESİZ 😤");
        } else if (recognizedFriend) {
          setStatus(recognizedFriend.message);
        } else if (!eyesClosed) {
          setStatus("Elini kameraya göster.");
        }
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

      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }

      if (friendAudioRef.current) {
        friendAudioRef.current.pause();
        friendAudioRef.current.currentTime = 0;
      }

      if (nahAudioRef.current) {
        nahAudioRef.current.pause();
        nahAudioRef.current.currentTime = 0;
      }

      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }

      if (friendMessageTimeoutRef.current) {
        clearTimeout(friendMessageTimeoutRef.current);
      }

      if (nahTimeoutRef.current) {
        clearTimeout(nahTimeoutRef.current);
      }

      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, []);

  return (
    <main
      className={
        alarmActive
          ? "app alarm-flash"
          : nahActive
          ? "app nah-shake"
          : "app"
      }
    >
      <video
        ref={videoRef}
        className="camera"
        playsInline
        muted
        autoPlay
      />

      <canvas ref={recognitionCanvasRef} className="recognition-canvas" />

      <div className="scene-layer">
        <Scene
          fistCount={fistCount}
          handPosition={handPosition}
          isPointing={isPointing}
          unicornRotation={unicornRotation}
          hideUnicorn={nahActive}
          hideEffects={nahActive}
        />
      </div>

      <div className="hud">
        <h1>Unicorn Gesture AR</h1>
        <p>{status}</p>

        <div
          className={
            fistCount > 0 || isPointing || recognizedFriend || nahActive
              ? "badge active"
              : "badge"
          }
        >
          {nahActive
            ? "Yakalandın 😤"
            : recognizedFriend
            ? `${recognizedFriend.name} tanındı ✨`
            : fistCount >= 2
            ? "2 yumruk algılandı ✨🌈"
            : fistCount === 1
            ? "1 yumruk algılandı 🌈"
            : isPointing
            ? "Unicorn koşuyor 🦄💨"
            : cameraReady
            ? faceRecognitionReady
              ? "Arkadaş tanıma aktif 👀"
              : "El bekleniyor ✋"
            : "Kamera kapalı"}
        </div>
      </div>

      {recognizedFriend && !nahActive && (
        <>
          <div className="friend-card">
            <div className="friend-card-name">{recognizedFriend.name}</div>
            <div className="friend-card-message">
              {recognizedFriend.message}
            </div>
          </div>

          <FriendEffect friend={recognizedFriend} />
        </>
      )}

      {nahActive && (
        <div className="nah-overlay">
          <div className="nah-emoji">🖕</div>

          <div className="nah-text-group">
            <div className="nah-title">DENEYECEĞİNİ BİLİYORDUM</div>
            <div className="nah-highlight">TERBİYESİZ 🥴</div>
            <div className="nah-subtitle">ŞEYMA seni yargılıyor...</div>
          </div>
        </div>
      )}

      {cameraReady && (sleepProgress >= 40 || alarmActive) && (
        <div className="sleep-panel">
          <div className="sleep-title">
            {alarmActive
              ? "Uyan! Gözlerin 5 saniyedir kapalı 🚨"
              : "Gözler kapalı algılandı 😴"}
          </div>

          <div className="sleep-bar">
            <div
              className="sleep-bar-fill"
              style={{ width: `${sleepProgress}%` }}
            />
          </div>

          <div className="sleep-counter">
            {alarmActive
              ? "Alarm aktif"
              : `${Math.max(
                  0,
                  Math.ceil((5000 - (sleepProgress / 100) * 5000) / 1000)
                )} sn`}
          </div>
        </div>
      )}

      {!cameraReady && started && (
        <div className="loading">Kamera yükleniyor...</div>
      )}

      {!cameraReady && (
        <button
          className="floating-start-button"
          onClick={startCamera}
          disabled={isStarting}
        >
          {isStarting ? "Başlatılıyor..." : "Kamerayı Başlat"}
        </button>
      )}
    </main>
  );
}