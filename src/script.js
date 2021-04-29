import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap';
import iro from '@jaames/iro';


const colorPicker = new iro.ColorPicker('#picker',{
    width: 150
});
//Color picker hex value
let colorPickerColor;

// listen to a color picker's color:change event
// color:change callbacks receive the current color
colorPicker.on('input:end', function(color) {
    // log the current color as a HEX string
    colorPickerColor = color.hexString;
  });



var vertexShader = `
    varying vec2 vUv;
    void main()	{
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
  var fragmentShader = `
		//#extension GL_OES_standard_derivatives : enable
    
    varying vec2 vUv;
    uniform float thickness;
    uniform vec3 color;
   	
    float edgeFactor(vec2 p){
    	vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
  		return min(grid.x, grid.y);
    }
    
    void main() {
			
      float a = clamp(edgeFactor(vUv), 0., 1.);
      
      vec3 c = mix(vec3(0), color, a);
      
      gl_FragColor = vec4(c, 1.0);
    }
  `;


// Global status of the current instance
const status = {
    started: false
}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x282828);

// Objects
const geom = new THREE.BoxBufferGeometry(5,5,5);

// Materials
var material = new THREE.ShaderMaterial({
    uniforms: {
      thickness: {
          value: 1.5
      },
      color: {
          value: new THREE.Color()
      }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    extensions: {derivatives: true}
  });


// Mesh
const cubes = new THREE.Group();

const distance = 5;

const createCubes = (rows, columns)=>{
    for(let i = 0; i<rows; i++){
        for(let j = 0; j<columns; j++){
            const box = new THREE.Mesh( geom, material.clone() );
            box.material.uniforms.color.value.set(0xffffff);
            box.position.x = (distance * i);
            box.position.z = (distance * j);
            cubes.add(box);
        }
    }
    scene.add( cubes );
}
createCubes(16,16);


// Lights

const light = new THREE.AmbientLight( 0xffffff, 1 ); // soft white light
scene.add( light );


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

//Raycaster pickhelper
class PickHelper {
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = null;
      this.pickedObjectSavedColor = 0;
      this.defaultColor = 0xffffff;
    }
    setDefaultColor(color){
        this.defaultColor = color;
    }
    pick(normalizedPosition, scene, camera, time) {
      // restore the color if there is a picked object
      if (this.pickedObject) {
        this.pickedObject.material.uniforms.color.value.set(this.pickedObjectSavedColor);
        this.pickedObject = undefined;
      }

      // cast a ray through the frustum
      this.raycaster.setFromCamera(normalizedPosition, camera);
      // get the list of objects the ray intersected
      const intersectedObjects = this.raycaster.intersectObjects(cubes.children);
      if (intersectedObjects.length) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObjects[0].object;
        // save its color
        this.pickedObjectSavedColor = this.pickedObject.material.uniforms.color.value;
        // set its color to a random hex value
        this.pickedObject.material.uniforms.color.value.set(this.defaultColor);
      }
    }
  }

  const pickHelper = new PickHelper();


const pickPosition = {x: 0, y: 0};
clearPickPosition();
 
function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
}
 
function clearPickPosition() {
  // unlike the mouse which always has a position
  // if the user stops touching the screen we want
  // to stop picking. For now we just pick a value
  // unlikely to pick something
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}
 
window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout', clearPickPosition);
window.addEventListener('mouseleave', clearPickPosition);


window.addEventListener('touchstart', (event) => {
    // prevent the window from scrolling
    event.preventDefault();
    setPickPosition(event.touches[0]);
  }, {passive: false});
   
  window.addEventListener('touchmove', (event) => {
    setPickPosition(event.touches[0]);
  });
   
  window.addEventListener('touchend', clearPickPosition);



//Set the colors of all the cubes, it receives a color parameter and it will print random colors if the parameter is empty
function setCubesColors(color){
    if(color){
        for(let i= 0; i < cubes.children.length; i++){
            cubes.children[i].material.uniforms.color.value.set(color);
        }
    }else{
        for(let i= 0; i < cubes.children.length; i++){
            cubes.children[i].material.uniforms.color.value.set(0xffffff * Math.random());
        }
    }   
}

//Starts an "animation" calling the serCubesColors method without a value, changing the cube colors to random colors
let animateCubesInterval;
function animateCubesColors(){
   animateCubesInterval = setInterval(() =>{
       if(!status.started){
           setCubesColors();
        }
    },2000);
}
animateCubesColors();

//Start button
const $startButton = document.querySelector('.start-button');

//Reset button
const $resetButton = document.querySelector('.reset-button');

//Color picker html element
const $colorPicker = document.querySelector('.color-picker');

//Start button event listener function
$startButton.addEventListener('click', (e)=>{
    e.preventDefault();
    const tweenDuration = 1.5;
    
    gsap.to('.start-button', {autoAlpha: 0, onComplete: hiddeStartButton})
    gsap.to(camera.position, {x: -12.91, duration: tweenDuration })
    gsap.to(camera.position, {y: 53.31, duration: tweenDuration})
    gsap.to(camera.position, {z: 41.76, duration: tweenDuration})
    gsap.to(camera.rotation, {x: -1.55, duration: tweenDuration})
    gsap.to(camera.rotation, {z: -1.55, duration: tweenDuration})
    gsap.to(camera.rotation, {y: -0.64, duration: tweenDuration, onComplete: start});

    const changeElementVisibility= (element, changeType)=>{
        if(changeType === "show"){
            element.classList.remove('hidden');
        }else if(changeType ==="hide"){
            element.classList.add('hidden');
        }
    }

    function hiddeStartButton(){
        changeElementVisibility($startButton, "hide");
    }

    function showResetButton(){
        changeElementVisibility($resetButton, "show");
    }

    function showColorPicker() {
        changeElementVisibility($colorPicker, "show");
    }
    
    function initCameraControls(){
        controls.enableRotate = true;
        controls.enableZoom = true;
    }

    function setStartedStatus() {
        status.started = true;
    }

    function clearAnimateCubesInterval() {
        clearInterval(animateCubesInterval);
    }

    function start(){

        setCubesColors(0xffffff);

        initCameraControls();

        showResetButton();

        showColorPicker();

        clearAnimateCubesInterval();

        setStartedStatus();
    }

    
})

//Reset button event listener function
$resetButton.addEventListener('click', (e)=>{
    e.preventDefault();
    setCubesColors(0xffffff);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(20, 20, 20);
scene.add(camera);


// Controls

const controls = new OrbitControls(camera, canvas);
 //controls.enableDamping = true;
 controls.minDistance = 30;
 controls.maxDistance = 100;
 controls.enableRotate = false;
 controls.enableZoom = false;
 
 controls.target = new THREE.Vector3(35, -15, 30); 
 controls.update();

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))




const animate = (time) =>{
    time *= 0.001;  // convert to seconds;
    
    pickHelper.pick(pickPosition, scene, camera, time);
    pickHelper.setDefaultColor(colorPickerColor)

    // Update Orbital Controls
    controls.update();


    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(animate);
}

animate();