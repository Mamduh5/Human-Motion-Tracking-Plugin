import type { HandLandmark, HandResult, Landmark, PoseResult } from "../../../src/index";

const CONNECTIONS: Array<[string, string]> = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];
const HAND_CONNECTIONS: Array<[string, string]> = [
  ["wrist", "thumbCmc"],
  ["thumbCmc", "thumbMcp"],
  ["thumbMcp", "thumbIp"],
  ["thumbIp", "thumbTip"],
  ["wrist", "indexFingerMcp"],
  ["indexFingerMcp", "indexFingerPip"],
  ["indexFingerPip", "indexFingerDip"],
  ["indexFingerDip", "indexFingerTip"],
  ["wrist", "middleFingerMcp"],
  ["middleFingerMcp", "middleFingerPip"],
  ["middleFingerPip", "middleFingerDip"],
  ["middleFingerDip", "middleFingerTip"],
  ["wrist", "ringFingerMcp"],
  ["ringFingerMcp", "ringFingerPip"],
  ["ringFingerPip", "ringFingerDip"],
  ["ringFingerDip", "ringFingerTip"],
  ["wrist", "pinkyMcp"],
  ["pinkyMcp", "pinkyPip"],
  ["pinkyPip", "pinkyDip"],
  ["pinkyDip", "pinkyTip"],
];

export function renderPose(canvas: HTMLCanvasElement, pose: PoseResult): void {
  renderMotionFrame(canvas, pose);
}

export function renderMotionFrame(canvas: HTMLCanvasElement, pose?: PoseResult, hands?: HandResult): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  resizeCanvasToDisplaySize(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);

  if (pose) {
    drawConnections(context, canvas, pose.landmarks);
    drawLandmarks(context, canvas, pose.landmarks);
  }

  if (hands) {
    drawHands(context, canvas, hands);
  }

  context.restore();
}

export function clearPose(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  resizeCanvasToDisplaySize(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawConnections(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, landmarks: Landmark[]): void {
  context.strokeStyle = "#38bdf8";
  context.lineWidth = 3;

  for (const [fromName, toName] of CONNECTIONS) {
    const from = landmarks.find((landmark) => landmark.name === fromName);
    const to = landmarks.find((landmark) => landmark.name === toName);

    if (!from || !to) {
      continue;
    }

    context.beginPath();
    context.moveTo(from.x * canvas.width, from.y * canvas.height);
    context.lineTo(to.x * canvas.width, to.y * canvas.height);
    context.stroke();
  }
}

function drawLandmarks(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, landmarks: Landmark[]): void {
  context.fillStyle = "#facc15";
  context.strokeStyle = "#111827";
  context.lineWidth = 2;

  for (const landmark of landmarks) {
    if ((landmark.visibility ?? 1) < 0.45) {
      continue;
    }

    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

function drawHands(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, result: HandResult): void {
  for (const hand of result.hands) {
    drawHandConnections(context, canvas, hand.landmarks);
    drawHandLandmarks(context, canvas, hand.landmarks);
  }
}

function drawHandConnections(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, landmarks: HandLandmark[]): void {
  context.strokeStyle = "#fb7185";
  context.lineWidth = 2;

  for (const [fromName, toName] of HAND_CONNECTIONS) {
    const from = landmarks.find((landmark) => landmark.name === fromName);
    const to = landmarks.find((landmark) => landmark.name === toName);

    if (!from || !to) {
      continue;
    }

    context.beginPath();
    context.moveTo(from.x * canvas.width, from.y * canvas.height);
    context.lineTo(to.x * canvas.width, to.y * canvas.height);
    context.stroke();
  }
}

function drawHandLandmarks(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, landmarks: HandLandmark[]): void {
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#be123c";
  context.lineWidth = 2;

  for (const landmark of landmarks) {
    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
  const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}
