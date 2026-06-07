import type { Landmark, PoseResult } from "../../../src/index";

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

export function renderPose(canvas: HTMLCanvasElement, pose: PoseResult): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  resizeCanvasToDisplaySize(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);

  drawConnections(context, canvas, pose.landmarks);
  drawLandmarks(context, canvas, pose.landmarks);

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

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
  const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}
