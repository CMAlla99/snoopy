//COLORS
let Colors = {
    red:0xf25346,
    white:0xd8d0d1,
    brown:0x59332e,
    brownDark:0x23190f,
    pink:0xF5986E,
    yellow:0xf4ce93,
    blue:0x68c3c0,

};

///////////////

// GAME VARIABLES
let game;
let deltaTime = 0;
let newTime = new Date().getTime();
let oldTime = new Date().getTime();
let ennemiesPool = [];
let particlesPool = [];
let particlesInUse = [];
let persos = [];

function resetGame(){
  game = {speed:0,
          initSpeed:.00035,
          baseSpeed:.00035,
          targetBaseSpeed:.00035,
          incrementSpeedByTime:.0000025,
          incrementSpeedByLevel:.000005,
          distanceForSpeedUpdate:200,
          speedLastUpdate:0,

          distance:0,
          ratioSpeedDistance:50,
          energy:100,
          ratioSpeedEnergy:3,

          level:1,
          levelLastUpdate:0,
          distanceForLevelUpdate:1000,
          woodstocklevels:[85, -65, -115],

          canoeDefaultHeight:100,
          canoeAmpHeight:150,
          canoeAmpWidth:75,
          canoeMoveSensivity:0.005,
          canoeRotXSensivity:0.0002,
          canoeRotZSensivity:0.0004,
          canoeFallSpeed:.001,
          canoeMinSpeed:1.2,
          canoeMaxSpeed:1.6,
          canoeSpeed:0,
          canoeCollisionDisplacementX:0,
          canoeCollisionSpeedX:0,

          canoeCollisionDisplacementY:0,
          canoeCollisionSpeedY:0,

          seaRadius:1000,
          seaLength:800,
          wavesMinAmp : 5,
          wavesMaxAmp : 20,
          wavesMinSpeed : 0.001,
          wavesMaxSpeed : 0.003,

          cameraFarPos:150,
          cameraNearPos:100,
          cameraSensivity:0.002,

          coinDistanceTolerance:15,
          coinValue:3,
          coinsSpeed:.5,
          coinLastSpawn:0,
          distanceForCoinsSpawn:100,

          ennemyDistanceTolerance:10,
          ennemyValue:10,
          ennemiesSpeed:.6,
          ennemyLastSpawn:0,
          distanceForEnnemiesSpawn:50,

          status : "playing",
         };
  fieldLevel.innerHTML = Math.floor(game.level);
}

//THREEJS RELATED VARIABLES

let scene,
    camera, fieldOfView, aspectRatio, nearcanoe, farcanoe,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

let HEIGHT, WIDTH,
    mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 50;
  nearcanoe = .1;
  farcanoe = 10000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearcanoe,
    farcanoe
    );
  scene.fog = new THREE.Fog(0xf7d9aa, 100,950);
  camera.position.x = 0;
  camera.position.z = 200;
  camera.position.y = 0;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
}

// MOUSE AND SCREEN EVENTS

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  let tx = -1 + (event.clientX / WIDTH)*2;
  let ty = 1 - (event.clientY / HEIGHT)*2;
  mousePos = {x:tx, y:ty};
}

function handleTouchMove(event) {
    event.preventDefault();
    let tx = -1 + (event.touches[0].pageX / WIDTH)*2;
    let ty = 1 - (event.touches[0].pageY / HEIGHT)*2;
    mousePos = {x:tx, y:ty};
}

function handleMouseUp(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}


function handleTouchEnd(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}

// LIGHTS

let ambientLight, hemisphereLight, shadowLight;

function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)

  ambientLight = new THREE.AmbientLight(0xdc8874, .5);

  shadowLight = new THREE.DirectionalLight(0xffffff, .9);
  shadowLight.position.set(150, 350, 350);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 4096;
  shadowLight.shadow.mapSize.height = 4096;

  let ch = new THREE.CameraHelper(shadowLight.shadow.camera);

  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight);

}

Sky = function(){
  this.mesh = new THREE.Object3D();
  this.nClouds = 20;
  this.clouds = [];
  let stepAngle = Math.PI*2 / this.nClouds;
  for(let i=0; i<this.nClouds; i++){
    let c = new Cloud();
    this.clouds.push(c);
    let a = stepAngle*i;
    let h = game.seaRadius + 150 + Math.random()*200;
    c.mesh.position.y = Math.sin(a)*h;
    c.mesh.position.x = Math.cos(a)*h;
    c.mesh.position.z = -300-Math.random()*500;
    c.mesh.rotation.z = a + Math.PI/2;
    let s = 1+Math.random()*2;
    c.mesh.scale.set(s,s,s);
    this.mesh.add(c.mesh);
  }
}

Sky.prototype.moveClouds = function(){
  for(let i=0; i<this.nClouds; i++){
    let c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed*deltaTime;

}

Sea = function(){
  let geom = new THREE.CylinderGeometry(game.seaRadius,game.seaRadius,game.seaLength,40,10);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));

  let mat = new THREE.MeshPhongMaterial({
    color:Colors.blue,
    transparent:true,
    opacity:.8,
    shading:THREE.FlatShading,

  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.name = "waves";
  this.mesh.receiveShadow = true;

}

Cloud = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "cloud";
  let geom = new THREE.BufferGeometry(20,20,20);
  let mat = new THREE.MeshPhongMaterial({
    color:Colors.white,

  });

  //*
  let nBlocs = 3+Math.floor(Math.random()*3);
  for (let i=0; i<nBlocs; i++ ){
    let m = new THREE.Mesh(geom.clone(), mat);
    m.position.x = i*15;
    m.position.y = Math.random()*10;
    m.position.z = Math.random()*10;
    m.rotation.z = Math.random()*Math.PI*2;
    m.rotation.y = Math.random()*Math.PI*2;
    let s = .1 + Math.random()*.9;
    m.scale.set(s,s,s);
    this.mesh.add(m);
    m.castShadow = true;
    m.receiveShadow = true;

  }
  //*/
}

Cloud.prototype.rotate = function(){
  let l = this.mesh.children.length;
  for(let i=0; i<l; i++){
    let m = this.mesh.children[i];
    m.rotation.z+= Math.random()*.005*(i+1);
    m.rotation.y+= Math.random()*.002*(i+1);
  }
}

Ennemy = function(){
  let geom = new THREE.TetrahedronGeometry(8,2);
  let mat = new THREE.MeshPhongMaterial({
    color:Colors.red,
    shininess:0,
    specular:0xffffff,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
}

EnnemiesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.ennemiesInUse = [];
}

EnnemiesHolder.prototype.spawnEnnemies = function(){
  let nEnnemies = game.level;

  for (let i=0; i<nEnnemies; i++){
    let ennemy;
    if (ennemiesPool.length) {
      ennemy = ennemiesPool.pop();
    }else{
      ennemy = new Ennemy();
    }

    ennemy.angle = - (i*0.1);
    ennemy.distance = game.seaRadius + game.canoeDefaultHeight + (-1 + Math.random() * 2) * (game.canoeAmpHeight-20);
    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;

    this.mesh.add(ennemy.mesh);
    this.ennemiesInUse.push(ennemy);
  }
}

EnnemiesHolder.prototype.rotateEnnemies = function(){
  for (let i=0; i<this.ennemiesInUse.length; i++){
    let ennemy = this.ennemiesInUse[i];
    ennemy.angle += game.speed*deltaTime*game.ennemiesSpeed;

    if (ennemy.angle > Math.PI*2) ennemy.angle -= Math.PI*2;

    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;
    ennemy.mesh.rotation.z += Math.random()*.1;
    ennemy.mesh.rotation.y += Math.random()*.1;

    let diffPos = canoe.position.clone().sub(ennemy.mesh.position.clone());
    let d = diffPos.length();
    if (d<game.ennemyDistanceTolerance){
      particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);

      ennemiesPool.unshift(this.ennemiesInUse.splice(i,1)[0]);
      this.mesh.remove(ennemy.mesh);
      game.canoeCollisionSpeedX = 100 * diffPos.x / d;
      game.canoeCollisionSpeedY = 100 * diffPos.y / d;
      ambientLight.intensity = 2;

      removeEnergy();
      i--;
    }else if (ennemy.angle > Math.PI){
      ennemiesPool.unshift(this.ennemiesInUse.splice(i,1)[0]);
      this.mesh.remove(ennemy.mesh);
      i--;
    }
  }
}

Particle = function(){
  let geom = new THREE.TetrahedronGeometry(3,0);
  let mat = new THREE.MeshPhongMaterial({
    color:0x009999,
    shininess:0,
    specular:0xffffff,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
}

Particle.prototype.explode = function(pos, color, scale){
  let _this = this;
  let _p = this.mesh.parent;
  this.mesh.material.color = new THREE.Color( color);
  this.mesh.material.needsUpdate = true;
  this.mesh.scale.set(scale, scale, scale);
  let targetX = pos.x + (-1 + Math.random()*2)*50;
  let targetY = pos.y + (-1 + Math.random()*2)*50;
  let speed = .6+Math.random()*.2;
  TweenMax.to(this.mesh.rotation, speed, {x:Math.random()*12, y:Math.random()*12});
  TweenMax.to(this.mesh.scale, speed, {x:.1, y:.1, z:.1});
  TweenMax.to(this.mesh.position, speed, {x:targetX, y:targetY, delay:Math.random() *.1, ease:Power2.easeOut, onComplete:function(){
      if(_p) _p.remove(_this.mesh);
      _this.mesh.scale.set(1,1,1);
      particlesPool.unshift(_this);
    }});
}

ParticlesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.particlesInUse = [];
}

ParticlesHolder.prototype.spawnParticles = function(pos, density, color, scale){

  let nPArticles = density;
  for (let i=0; i<nPArticles; i++){
    let particle;
    if (particlesPool.length) {
      particle = particlesPool.pop();
    }else{
      particle = new Particle();
    }
    this.mesh.add(particle.mesh);
    particle.mesh.visible = true;
    let _this = this;
    particle.mesh.position.y = pos.y;
    particle.mesh.position.x = pos.x;
    particle.explode(pos,color, scale);
  }
}

Coin = function(){
  let geom = new THREE.TetrahedronGeometry(5,0);
  let mat = new THREE.MeshPhongMaterial({
    color:0x009999,
    shininess:0,
    specular:0xffffff,

    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
}

CoinsHolder = function (nCoins){
  this.mesh = new THREE.Object3D();
  this.coinsInUse = [];
  this.coinsPool = [];
  for (let i=0; i<nCoins; i++){
    let coin = new Coin();
    this.coinsPool.push(coin);
  }
}

CoinsHolder.prototype.spawnCoins = function(){

  let nCoins = 1 + Math.floor(Math.random()*10);
  let d = game.seaRadius + game.canoeDefaultHeight + (-1 + Math.random() * 2) * (game.canoeAmpHeight-70);
  let amplitude = 10 + Math.round(Math.random()*10);
  for (let i=0; i<nCoins; i++){
    let coin;
    if (this.coinsPool.length) {
      coin = this.coinsPool.pop();
    }else{
      coin = new Coin();
    }
    this.mesh.add(coin.mesh);
    this.coinsInUse.push(coin);
    coin.angle = - (i*0.02);
    coin.distance = d + Math.cos(i*.5)*amplitude;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
  }
}

CoinsHolder.prototype.rotateCoins = function(){
  for (let i=0; i<this.coinsInUse.length; i++){
    let coin = this.coinsInUse[i];
    if (coin.exploding) continue;
    coin.angle += game.speed*deltaTime*game.coinsSpeed;
    if (coin.angle>Math.PI*2) coin.angle -= Math.PI*2;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
    coin.mesh.rotation.z += Math.random()*.1;
    coin.mesh.rotation.y += Math.random()*.1;

    let diffPos = canoe.position.clone().sub(coin.mesh.position.clone());
    let d = diffPos.length();
    if (d<game.coinDistanceTolerance){
      this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
      this.mesh.remove(coin.mesh);
      particlesHolder.spawnParticles(coin.mesh.position.clone(), 5, 0x009999, .8);
      addEnergy();
      i--;
    }else if (coin.angle > Math.PI){
      this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    }
  }
}


// 3D Models
const loader = new THREE.GLTFLoader();
loader.setPath( 'models/' );

let sea;
let canoe = null;

function createSnoopy(){

  loader.load(
    // resource URL
    'snoopy.glb',
    // called when the resource is loaded
    function ( gltf ) {
      
      const snoopy = gltf.scene;
      //const mesh = canoe.children[1];
      snoopy.scale.set(180.,180.,180.);
      snoopy.rotation.y = 45;
      snoopy.position.x = -15;
      snoopy.position.y = -17;
      canoe.add(snoopy);
  
    },
    // called while loading is progressing
    function ( xhr ) {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% Snoopy loaded' );
    },
    // called when loading has errors
    function ( error ) {
      console.log( 'An error happened' );
    });
}

function createWoodstock(){

  loader.load(
    // resource URL
    'woodstock.glb',
    // called when the resource is loaded
    function ( gltf ) {
      
      const woodstock = gltf.scene;
      woodstock.scale.set(16.,16.,16.);
      woodstock.rotation.y = 45;
      woodstock.position.x = 35;
      woodstock.position.y = 35;
      persos.push(woodstock);
      canoe.add(woodstock);
  
    },
    // called while loading is progressing
    function ( xhr ) {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% Woodstock loaded' );
    },
    // called when loading has errors
    function ( error ) {
      console.log( 'An error happened' );
    });
}

function createWoodstock2(i, x){

  loader.load(
    // resource URL
    'woodstock.glb',
    // called when the resource is loaded
    function ( gltf ) {
      
      const woodstock = gltf.scene;
      woodstock.scale.set(16.,16.,16.);
      woodstock.rotation.y = 45;
      woodstock.position.x = x;
      woodstock.position.y = 35;
      persos.push(woodstock);
      canoe.add(persos[i]);
  
    },
    // called while loading is progressing
    function ( xhr ) {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% Woodstock loaded' );
    },
    // called when loading has errors
    function ( error ) {
      console.log( 'An error happened' );
    });
}

function createCanoe(){

  loader.load(
    // resource URL
    'canoe.glb',
    // called when the resource is loaded
    function ( gltf ) {
      
      canoe = gltf.scene;
      canoe.scale.set(.25,.25,.25);
      canoe.position.y = 0;

      createSnoopy();
      createWoodstock();

      scene.add(canoe);

      loop();
    },
    // called while loading is progressing
    function ( xhr ) {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% Canon loaded' );
    },
    // called when loading has errors
    function ( error ) {
      console.log( 'An error happened' );
    });
}


function createSea(){
  sea = new Sea();
  sea.mesh.position.y = -game.seaRadius;
  scene.add(sea.mesh);
}

function createSky(){
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}

function createCoins(){

  coinsHolder = new CoinsHolder(20);
  scene.add(coinsHolder.mesh)
}

function createEnnemies(){
  for (let i=0; i<10; i++){
    let ennemy = new Ennemy();
    ennemiesPool.push(ennemy);
  }
  ennemiesHolder = new EnnemiesHolder();
  scene.add(ennemiesHolder.mesh)
}

function createParticles(){
  for (let i=0; i<10; i++){
    let particle = new Particle();
    particlesPool.push(particle);
  }
  particlesHolder = new ParticlesHolder();
  scene.add(particlesHolder.mesh)
}

function loop(){

  newTime = new Date().getTime();
  deltaTime = newTime-oldTime;
  oldTime = newTime;

  if (game.status=="playing"){

    // Add energy coins every 100m;
    if (Math.floor(game.distance)%game.distanceForCoinsSpawn == 0 && Math.floor(game.distance) > game.coinLastSpawn){
      game.coinLastSpawn = Math.floor(game.distance);
      coinsHolder.spawnCoins();
    }

    if (Math.floor(game.distance)%game.distanceForSpeedUpdate == 0 && Math.floor(game.distance) > game.speedLastUpdate){
      game.speedLastUpdate = Math.floor(game.distance);
      game.targetBaseSpeed += game.incrementSpeedByTime*deltaTime;
    }


    if (Math.floor(game.distance)%game.distanceForEnnemiesSpawn == 0 && Math.floor(game.distance) > game.ennemyLastSpawn){
      game.ennemyLastSpawn = Math.floor(game.distance);
      ennemiesHolder.spawnEnnemies();
    }

    if (Math.floor(game.distance)%game.distanceForLevelUpdate == 0 && Math.floor(game.distance) > game.levelLastUpdate){
      game.levelLastUpdate = Math.floor(game.distance);
      game.level++;
      if (game.level < 5) {
        createWoodstock2(game.level-1, game.woodstocklevels[game.level-2]);
      }
      fieldLevel.innerHTML = Math.floor(game.level);

      game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel*game.level
    }

    updateCanoe();
    updateDistance();
    updateEnergy();
    game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
    game.speed = game.baseSpeed * game.canoeSpeed;

  }else if(game.status=="gameover"){

    game.speed *= .99;
    canoe.rotation.z += (-Math.PI/2 - canoe.rotation.z)*.0002*deltaTime;
    canoe.rotation.x += 0.0003*deltaTime;
    game.canoeFallSpeed *= 1.05;
    canoe.position.y -= game.canoeFallSpeed*deltaTime;

    if (canoe.position.y <-200){
      showReplay();
      game.status = "waitingReplay";

    }
  }else if (game.status=="waitingReplay"){

  }

  
  canoe.rotation.x +=.2 + game.canoeSpeed * deltaTime*.005;
  sea.mesh.rotation.z += game.speed*deltaTime;

  if ( sea.mesh.rotation.z > 2*Math.PI)  sea.mesh.rotation.z -= 2*Math.PI;

  ambientLight.intensity += (.5 - ambientLight.intensity)*deltaTime*0.005;

  coinsHolder.rotateCoins();
  ennemiesHolder.rotateEnnemies();

  sky.moveClouds();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function updateDistance(){
  game.distance += game.speed*deltaTime*game.ratioSpeedDistance;
  fieldDistance.innerHTML = Math.floor(game.distance);
  let d = 502*(1-(game.distance%game.distanceForLevelUpdate)/game.distanceForLevelUpdate);
  levelCircle.setAttribute("stroke-dashoffset", d);

}

let blinkEnergy=false;

function updateEnergy(){
  game.energy -= game.speed*deltaTime*game.ratioSpeedEnergy;
  game.energy = Math.max(0, game.energy);
  energyBar.style.right = (100-game.energy)+"%";
  energyBar.style.backgroundColor = (game.energy<50)? "#f25346" : "#68c3c0";

  if (game.energy<30){
    energyBar.style.animationName = "blinking";
  }else{
    energyBar.style.animationName = "none";
  }

  if (game.energy <1){
    game.status = "gameover";
  }
}

function addEnergy(){
  game.energy += game.coinValue;
  game.energy = Math.min(game.energy, 100);
}

function removeEnergy(){
  game.energy -= game.ennemyValue;
  game.energy = Math.max(0, game.energy);
}

function updateCanoe(){

  game.canoeSpeed = normalize(mousePos.x,-.5,.5,game.canoeMinSpeed, game.canoeMaxSpeed);
  let targetY = normalize(mousePos.y,-.75,.75,game.canoeDefaultHeight-70, game.canoeDefaultHeight+game.canoeAmpHeight);
  let targetX = normalize(mousePos.x,-1,1,-game.canoeAmpWidth*.7, -game.canoeAmpWidth);

  game.canoeCollisionDisplacementX += game.canoeCollisionSpeedX;
  targetX += game.canoeCollisionDisplacementX;


  game.canoeCollisionDisplacementY += game.canoeCollisionSpeedY;
  targetY += game.canoeCollisionDisplacementY;

  canoe.position.y += (targetY-canoe.position.y)*deltaTime*game.canoeMoveSensivity;
  canoe.position.x += (targetX-canoe.position.x)*deltaTime*game.canoeMoveSensivity;

  canoe.rotation.z = (targetY-canoe.position.y)*deltaTime*game.canoeRotXSensivity;
  canoe.rotation.x = (canoe.position.y-targetY)*deltaTime*game.canoeRotZSensivity;
  let targetCameraZ = normalize(game.canoeSpeed, game.canoeMinSpeed, game.canoeMaxSpeed, game.cameraNearPos, game.cameraFarPos);
  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix ()
  camera.position.y += (canoe.position.y - camera.position.y)*deltaTime*game.cameraSensivity;

  game.canoeCollisionSpeedX += (0-game.canoeCollisionSpeedX)*deltaTime * 0.03;
  game.canoeCollisionDisplacementX += (0-game.canoeCollisionDisplacementX)*deltaTime *0.01;
  game.canoeCollisionSpeedY += (0-game.canoeCollisionSpeedY)*deltaTime * 0.03;
  game.canoeCollisionDisplacementY += (0-game.canoeCollisionDisplacementY)*deltaTime *0.01;
}


function showReplay(){
  replayMessage.style.display="block";
}

function hideReplay(){
  replayMessage.style.display="none";
}

function normalize(v,vmin,vmax,tmin, tmax){
  let nv = Math.max(Math.min(v,vmax), vmin);
  let dv = vmax-vmin;
  let pc = (nv-vmin)/dv;
  let dt = tmax-tmin;
  let tv = tmin + (pc*dt);
  return tv;
}

let fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;

function init(event){

  // UI

  fieldDistance = document.getElementById("distValue");
  energyBar = document.getElementById("energyBar");
  replayMessage = document.getElementById("replayMessage");
  fieldLevel = document.getElementById("levelValue");
  levelCircle = document.getElementById("levelCircleStroke");

  resetGame();
  createScene();

  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);

  createLights();
  createSea();
  createSky();
  createCoins();
  createEnnemies();
  createParticles();

  createCanoe();
}

window.addEventListener('load', init, false);
