var container, controls;
var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock;

var movingCube;
var collideMeshList = [];
var cubes = [];
var message = document.getElementById("message");
var crash = false;
var score = 0;
var scoreText = document.getElementById("score");
var id = 0;
var crashId = " ";
var lastCrashId = " ";

let scene;
let camera;
let renderer;
let simplex;
let plane;
let geometry;
let xZoom;
let yZoom;
let noiseStrength;

var bluetoothConnected = false;

var zOrientation = 0;

let counter = 3;

setup();
init();
draw();

function setup(){
	setupNoise();
	setupScene();
	setupCamera();
	setupRenderer();
	setupPlane();
	setupLights();
	setupEventListeners();
}

function setupNoise() {
  // By zooming y more than x, we get the
  // appearence of flying along a valley
  xZoom = 7;
  yZoom = 15;
  noiseStrength = 1.5;
  simplex = new SimplexNoise();
}

function setupScene() {
  scene = new THREE.Scene();
}

function setupCamera() {
  let res = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, res, 0.1, 1000);
  camera.position.x = 0;
  camera.position.y = -20;
  camera.position.z = 1;

  camera.rotation.x = -250;
  
  let controls = new THREE.OrbitControls(camera);
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ 
    antialias: true
  });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.autoClear = false;
	renderer.setClearColor(0x000000, 0.0);
	renderer.setClearAlpha(1.0);

  document.body.appendChild(renderer.domElement);
}

function setupPlane() {
  let side = 120;
  geometry = new THREE.PlaneGeometry(40, 40, side, side);
  let material = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    color: new THREE.Color(0x91FCFD),
    // wireframe: true 
  });
  plane = new THREE.Mesh(geometry, material);
  plane.castShadow = true;
  plane.receiveShadow = true;

  scene.add(plane);
}


function setupLights() {
  let ambientLight = new THREE.AmbientLight(0x0c0c0c);
  scene.add(ambientLight);
  
  let spotLight = new THREE.SpotLight(0xcccccc);
  spotLight.position.set(-30, 60, 60);
  spotLight.castShadow = true;
  scene.add(spotLight);
}

function setupEventListeners() {
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
    // scene.fog = new THREE.FogExp2( new THREE.Color("rgb(0,0,0)"), 0.0004 );
    scene.fog = new THREE.FogExp2( new THREE.Color("#5a008a"), 0.0003 );

    container = document.getElementById("ThreeJS");
    container.appendChild(renderer.domElement);

    THREEx.WindowResize(renderer, camera);

    var light = new THREE.PointLight();
    light.position.set(200, 200, 100);
    var lightSize = 30;
    lightHelper = new THREE.PointLightHelper(light, lightSize);
    scene.add(light);
    scene.add(lightHelper);

    var size = window.innerWidth * 2;
    var divisions = 100;

    var cubeGeometry = new THREE.CubeGeometry(.5, .5, .2, 5, 5, 5);
    var wireMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true
    });

    movingCube = new THREE.Mesh(cubeGeometry, wireMaterial);
    //            movingCube = new THREE.Mesh(cubeGeometry, material);
    //            movingCube = new THREE.BoxHelper(movingCube);
    movingCube.position.set(0, -18.8, 0.1);
    scene.add(movingCube);

    renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}


function draw() {
  requestAnimationFrame(draw);
  let offset = Date.now() * 0.0004;
  adjustVertices(offset);
	adjustCameraPos(offset);
  renderer.render(scene, camera);
}

function adjustVertices(offset) {
  for (let i = 0; i < plane.geometry.vertices.length; i++) {
    let vertex = plane.geometry.vertices[i];
    let x = vertex.x / xZoom;
    let y = vertex.y / yZoom;
    
    if(vertex.x < -2 || vertex.x > 2){
      let noise = simplex.noise2D(x, y + offset) * noiseStrength; 
      vertex.z = noise;
    }
  }
  geometry.verticesNeedUpdate = true;
  geometry.computeVertexNormals();
}

function adjustCameraPos(offset) {  
  let x = camera.position.x / xZoom;
  let y = camera.position.y / yZoom;
  let noise = simplex.noise2D(x, y + offset) * noiseStrength + 1.5; 
  // camera.position.z = noise;
}

function update() {
    var delta = clock.getDelta();
    var moveDistance = 200 * delta;
    var rotateAngle = Math.PI / 2 * delta;

    movingCube.position.x -= zOrientation;

    if(movingCube.position.x > 75 && zOrientation < 0){
      movingCube.position.x += zOrientation;
    }
    if(movingCube.position.x < -75 && zOrientation > 0){
      movingCube.position.x += zOrientation;
    }

    var originPoint = movingCube.position.clone();

    for (var vertexIndex = 0; vertexIndex < movingCube.geometry.vertices.length; vertexIndex++) {
        var localVertex = movingCube.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(movingCube.matrix);
        var directionVector = globalVertex.sub(movingCube.position);

        var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
        var collisionResults = ray.intersectObjects(collideMeshList);
        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
            crash = true;
            crashId = collisionResults[0].object.name;
            break;
        }
        crash = false;
    }

    if (crash) {
        movingCube.material.color.setHex(0x346386);
        console.log("Crash");
        if (crashId !== lastCrashId) {
            score -= 100;
            lastCrashId = crashId;
        }

        document.getElementById('explode_sound').play()
    } else {
        movingCube.material.color.setHex(0x00ff00);
    }

    if (Math.random() < 0.03 && cubes.length < 30) {
        makeRandomCube();
    }

    for (i = 0; i < cubes.length; i++) {
        if (cubes[i].position.z > camera.position.z) {
            scene.remove(cubes[i]);
            cubes.splice(i, 1);
            collideMeshList.splice(i, 1);
        } else {
            cubes[i].position.z += 10;
        }
        //                renderer.render(scene, camera);
    }

    score += 0.1;
    scoreText.innerText = "Score:" + Math.floor(score);
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function makeRandomCube() {
    var a = 1 * 50,
        b = getRandomInt(1, 3) * 50,
        c = 1 * 50;
    var geometry = new THREE.CubeGeometry(a, b, c);
    var material = new THREE.MeshBasicMaterial({
        color: Math.random() * 0xffffff,
        size: 3,
    });

    var object = new THREE.Mesh(geometry, material);
    var box = new THREE.BoxHelper(object);
        // box.material.color.setHex(Math.random() * 0xffffff);
    box.material.color.setHex(0xff0000);

    box.position.x = getRandomArbitrary(-250, 250);
    box.position.y = 1 + b / 2;
    // box.position.z = getRandomArbitrary(-800, -1200);
    box.position.z = getRandomArbitrary(-3000, -5000);
    cubes.push(box);
    box.name = "box_" + id;
    id++;
    collideMeshList.push(box);

    scene.add(box);
}

function displayCounter(){
  const counterDiv = document.getElementsByClassName('counter')[0];
  counterDiv.innerHTML = counter;
  if(counter > 0){
    counter--;
  } else if(counter === 0){
    clearInterval(interval);
    counterDiv.classList.add('fade-out');
    animate();
  }
}

let interval;

window.onload = () => {
  const connectButton = document.getElementById('connect');
  var initialised = false;
  var previousValue;
  var difference;

  connectButton.onclick = function(){

    var controller = new DaydreamController();
    controller.onStateChange( function ( state ) {
      if(!bluetoothConnected){
        bluetoothConnected = true;
        connectButton.classList.add('fade-out');
        const title = document.getElementsByClassName('title')[0];
        title.classList.add('fade-out');

        interval = setInterval(function(){
          displayCounter();
        },1000);
      }

        if(previousValue !== state.zOri){
          // zOrientation = state.zOri * 10;
          difference = state.zOri - previousValue;
          zOrientation = state.zOri * 15
        }
        previousValue = state.zOri
        // var angle = Math.sqrt( state.xOri * state.xOri + state.yOri * state.yOri + state.zOri * state.zOri );
    } );
    controller.connect();
  }
}
