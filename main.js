import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as handTrack from 'handtrackjs';
// import * as handTrack from '../node_modules/handtrackjs/dist/handtrack.min.js';  // for standalone
import 'hammer-simulator';

const start = async (element, video, canvas, {
  model = null,
  modelParams = {},
  transform = (prediction, video, target) => ({
    x: (prediction.bbox[0] + 0.5 * prediction.bbox[2]) /
        video.width * target.offsetWidth + target.offsetLeft,
    y: (prediction.bbox[1] + 0.5 * prediction.bbox[3]) /
        video.height * target.offsetHeight + target.offsetTop,
    target: target,
  }),
} = {}) => {
  modelParams = {
    flipHorizontal: true,   // flip e.g for video
    maxNumBoxes: 2,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
    ...modelParams,
  };

  let videoStatus = await handTrack.startVideo(video);
  if (!videoStatus) throw 'Start video failed';
  if (!model) model = await handTrack.load(modelParams);


  const context = canvas.getContext("2d");
  let lastPredictions = [];
  let touches = [];
  function runDetection() {
    model.detect(video).then(predictions => {
      model.renderPredictions(predictions, canvas, context, video);

      if (lastPredictions.length === 0 && predictions.length > 0) {
        touches = predictions.map(prediction =>
          transform(prediction, video, element));
        Simulator.events.touch.trigger(touches, touches[0].target, 'start');
      } else if (predictions.length === 0 && lastPredictions.length > 0) {
        touches = lastPredictions.map(prediction =>
          transform(prediction, video, element));
        Simulator.events.touch.trigger(touches, touches[0].target, 'end');
      } else if (predictions.length > 0) {
        touches = predictions.map(prediction =>
          transform(prediction, video, element));
        Simulator.events.touch.trigger(touches, touches[0].target, 'move');
      }
      lastPredictions = predictions;

      requestAnimationFrame(runDetection);
    });
  }


  runDetection();
}


export {
  start
};
// Setup

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);
camera.position.setX(-3);

renderer.render(scene, camera);

// Torus
const geometry = new THREE.TorusKnotGeometry(10, 3, 48, 7, 3, 3);
const material = new THREE.MeshStandardMaterial({ color: 0xfff000 });
const torus = new THREE.Mesh(geometry, material);

scene.add(torus);

// Lights

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);

// Helpers

// const lightHelper = new THREE.PointLightHelper(pointLight)
// const gridHelper = new THREE.GridHelper(200, 50);
// scene.add(lightHelper, gridHelper)

// const controls = new OrbitControls(camera, renderer.domElement);

function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 24, 24);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3)
    .fill()
    .map(() => THREE.MathUtils.randFloatSpread(100));

  star.position.set(x, y, z);
  scene.add(star);
}

Array(200).fill().forEach(addStar);

// Background

const spaceTexture = new THREE.TextureLoader().load('space.jpg');
scene.background = spaceTexture;

// Avatar

const jeffTexture = new THREE.TextureLoader().load('jeff.png');

const jeff = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshBasicMaterial({ map: jeffTexture }));

scene.add(jeff);

// Moon

const moonTexture = new THREE.TextureLoader().load('moon.jpg');
const normalTexture = new THREE.TextureLoader().load('normal.jpg');

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshStandardMaterial({
    map: moonTexture,
    normalMap: normalTexture,
  })
);

scene.add(moon);

moon.position.z = 30;
moon.position.setX(-10);

jeff.position.z = -5;
jeff.position.x = 2;

// Scroll Animation

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;
  moon.rotation.x += 0.05;
  moon.rotation.y += 0.075;
  moon.rotation.z += 0.05;

  jeff.rotation.y += 0.01;
  jeff.rotation.z += 0.01;

  camera.position.z = t * -0.01;
  camera.position.x = t * -0.0002;
  camera.rotation.y = t * -0.0002;
}

document.body.onscroll = moveCamera;
moveCamera();

// Animation Loop

function animate() {
  requestAnimationFrame(animate);

  torus.rotation.x += 0.01;
  torus.rotation.y += 0.005;
  torus.rotation.z += 0.01;

  moon.rotation.x += 0.005;

  // controls.update();

  renderer.render(scene, camera);
}

animate();
