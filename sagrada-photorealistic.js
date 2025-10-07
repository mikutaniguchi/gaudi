// Three.js グローバル変数
let scene, camera, renderer, controls;
let sagradaGroup;
let currentYear = 1882;
let targetYear = 1882;
let isAnimating = false;
let animationSpeed = 0.5;
let particleSystem;
let constructionCranes = [];

// 材質とテクスチャ
let stoneMaterials = {};
let sculptureDetails = {};

// 建築要素
let foundations, crypts;
let nativityFacade = { towers: [], facade: null, details: [], sculptures: [] };
let passionFacade = { towers: [], facade: null, details: [], sculptures: [] };
let gloryFacade = { towers: [], facade: null, details: [] };
let centralTowers = { jesus: null, mary: null, evangelists: [] };
let naves, transepts;
let stainedGlassWindows = [];

// 建設フェーズ
const constructionPhases = [
  { year: 1882, phase: "建設開始", description: "フランシスコ・デ・ビリャール設計による着工" },
  { year: 1883, phase: "ガウディ就任", description: "31歳のアントニ・ガウディが主任建築家に" },
  { year: 1889, phase: "地下聖堂完成", description: "ネオ・ゴシック様式の地下聖堂" },
  { year: 1900, phase: "生誕のファサード着工", description: "東側、イエスの誕生を表現" },
  { year: 1925, phase: "生誕のファサード塔", description: "最初の鐘塔が完成" },
  { year: 1926, phase: "ガウディ逝去", description: "73歳、未完の傑作を残して" },
  { year: 1936, phase: "内戦による中断", description: "設計図の多くが焼失" },
  { year: 1954, phase: "受難のファサード着工", description: "西側、キリストの受難を表現" },
  { year: 1977, phase: "受難のファサード塔", description: "4本の鐘塔が立ち上がる" },
  { year: 1986, phase: "スビラクスの彫刻", description: "現代的な受難の場面" },
  { year: 2000, phase: "身廊の建設", description: "中央の大空間" },
  { year: 2010, phase: "教皇による聖別", description: "バシリカとして認定" },
  { year: 2016, phase: "中央塔群着工", description: "最も高い塔の建設開始" },
  { year: 2020, phase: "マリアの塔", description: "138メートル、星の照明" },
  { year: 2026, phase: "完成予定", description: "ガウディ没後100年" }
];

// テクスチャローダー
const textureLoader = new THREE.TextureLoader();

// 初期化
function init() {
  // シーン作成
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x101020, 0.0015);
  
  // 空のグラデーション背景
  createRealisticSky();
  
  // カメラ設定
  camera = new THREE.PerspectiveCamera(
    50, 
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(200, 120, 300);
  camera.lookAt(0, 50, 0);
  
  // レンダラー設定
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  
  // カメラコントロール
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 30;
  controls.maxDistance = 800;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 50, 0);
  
  // 材質を初期化
  createStoneMaterials();
  
  // ライティング
  setupRealisticLighting();
  
  // サグラダファミリアグループ
  sagradaGroup = new THREE.Group();
  scene.add(sagradaGroup);
  
  // 地面と環境
  createEnvironment();
  
  // パーティクルシステム
  createParticleSystem();
  
  // 建物を作成
  createSagradaFamilia();
  
  // イベントリスナー
  setupEventListeners();
  
  // 読み込み完了
  document.getElementById('loading').style.display = 'none';
  
  // アニメーション開始
  animate();
}

// リアルな空を作成
function createRealisticSky() {
  const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      turbidity: { value: 10 },
      rayleigh: { value: 2 },
      mieCoefficient: { value: 0.005 },
      mieDirectionalG: { value: 0.8 },
      sunPosition: { value: new THREE.Vector3(100, 100, 100) },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float turbidity;
      uniform float rayleigh;
      uniform float mieCoefficient;
      uniform float mieDirectionalG;
      uniform vec3 sunPosition;
      uniform float time;
      varying vec3 vWorldPosition;
      
      vec3 totalRayleigh(vec3 lambda) {
        return (8.0 * pow(3.14159, 3.0) * pow(pow(6.0, 2.0) - pow(1.3, 2.0), 2.0) * (6.0 + 3.0)) / (3.0 * 6.02e23 * pow(lambda, vec3(4.0)) * (6.0 - 1.0));
      }
      
      void main() {
        vec3 direction = normalize(vWorldPosition);
        vec3 sunDirection = normalize(sunPosition);
        
        float cosAngle = dot(direction, sunDirection);
        float rayleighPhase = 0.75 * (1.0 + cosAngle * cosAngle);
        
        vec3 rayleighCoeff = totalRayleigh(vec3(680e-9, 550e-9, 450e-9)) * rayleigh;
        
        vec3 skyColor = vec3(0.5, 0.7, 1.0) * rayleighPhase;
        skyColor = mix(vec3(1.0, 0.9, 0.7), skyColor, clamp(direction.y * 2.0, 0.0, 1.0));
        
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
    side: THREE.BackSide
  });
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
}

// 石材マテリアルを作成
function createStoneMaterials() {
  // プロシージャルなノイズテクスチャを作成
  function createNoiseTexture(size, scale, intensity) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(size, size);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      
      // パーリンノイズの簡易版
      const noise = Math.sin(x * scale) * Math.cos(y * scale) * intensity +
                   Math.sin(x * scale * 2) * Math.cos(y * scale * 2) * intensity * 0.5 +
                   Math.random() * 0.1;
      
      const value = Math.floor((noise + 1) * 127.5);
      imageData.data[i] = value;     // R
      imageData.data[i + 1] = value; // G
      imageData.data[i + 2] = value; // B
      imageData.data[i + 3] = 255;   // A
    }
    
    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  // 法線マップを作成
  function createNormalMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(size, size);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      
      // 石の凹凸パターン
      const nx = (Math.sin(x * 0.1) + Math.sin(x * 0.05) * 0.5) * 0.5 + 0.5;
      const ny = (Math.cos(y * 0.1) + Math.cos(y * 0.05) * 0.5) * 0.5 + 0.5;
      const nz = 1.0;
      
      imageData.data[i] = Math.floor(nx * 255);     // R (X)
      imageData.data[i + 1] = Math.floor(ny * 255); // G (Y)
      imageData.data[i + 2] = Math.floor(nz * 127 + 128); // B (Z)
      imageData.data[i + 3] = 255;   // A
    }
    
    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  // 粗いマップを作成
  function createRoughnessMap(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(size, size);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      
      // 石の表面の粗さ
      const roughness = 0.7 + Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.3 + Math.random() * 0.2;
      const value = Math.floor(Math.min(Math.max(roughness, 0), 1) * 255);
      
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }
    
    context.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  // 生誕のファサード用石材（暖かい色調）
  stoneMaterials.nativity = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    map: createNoiseTexture(512, 0.02, 0.3),
    normalMap: createNormalMap(512),
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: createRoughnessMap(512),
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0
  });
  
  // 受難のファサード用石材（グレー、モダン）
  stoneMaterials.passion = new THREE.MeshStandardMaterial({
    color: 0x808080,
    map: createNoiseTexture(512, 0.03, 0.2),
    normalMap: createNormalMap(512),
    normalScale: new THREE.Vector2(2.0, 2.0),
    roughnessMap: createRoughnessMap(512),
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0
  });
  
  // 中央塔用石材（金色がかった）
  stoneMaterials.central = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    map: createNoiseTexture(1024, 0.01, 0.4),
    normalMap: createNormalMap(1024),
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: createRoughnessMap(1024),
    roughness: 0.6,
    metalness: 0.2,
    transparent: true,
    opacity: 0
  });
  
  // 基礎用石材（古い、風化した）
  stoneMaterials.foundation = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    map: createNoiseTexture(256, 0.05, 0.5),
    normalMap: createNormalMap(256),
    normalScale: new THREE.Vector2(2.5, 2.5),
    roughnessMap: createRoughnessMap(256),
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0
  });
}

// リアルなライティング設定
function setupRealisticLighting() {
  // 環境光（弱く）
  const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
  scene.add(ambientLight);
  
  // 半球光（空からの光）
  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.4);
  scene.add(hemisphereLight);
  
  // 太陽光（メインライト、より強く）
  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
  sunLight.position.set(150, 250, 150);
  sunLight.castShadow = true;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 800;
  sunLight.shadow.camera.left = -200;
  sunLight.shadow.camera.right = 200;
  sunLight.shadow.camera.top = 200;
  sunLight.shadow.camera.bottom = -200;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);
  
  // 補助光（反射光）
  const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4);
  fillLight.position.set(-150, 100, -150);
  scene.add(fillLight);
  
  // リムライト（エッジを強調）
  const rimLight = new THREE.DirectionalLight(0xffeaa7, 0.3);
  rimLight.position.set(50, 50, -200);
  scene.add(rimLight);
}

// 環境作成
function createEnvironment() {
  // 詳細な地面
  const groundSize = 600;
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 200, 200);
  
  // 地面の頂点を変形（石畳風の凹凸）
  const vertices = groundGeometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    
    // 石畳のパターン
    const stonePattern = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 +
                        Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.8 +
                        Math.random() * 0.3;
    
    vertices[i + 2] = stonePattern;
  }
  groundGeometry.computeVertexNormals();
  
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a3a3a,
    roughness: 0.95,
    metalness: 0.05,
    normalScale: new THREE.Vector2(1, 1)
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // 周辺建物
  createSurroundingBuildings();
}

// 周辺建物
function createSurroundingBuildings() {
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0x606060,
    roughness: 0.8,
    metalness: 0.1,
    opacity: 0.6,
    transparent: true
  });
  
  const positions = [
    { x: -250, z: -150, w: 50, h: 40, d: 50 },
    { x: 250, z: -200, w: 60, h: 50, d: 60 },
    { x: -220, z: 180, w: 55, h: 45, d: 55 },
    { x: 200, z: 150, w: 45, h: 35, d: 45 }
  ];
  
  positions.forEach(pos => {
    const geometry = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
    const building = new THREE.Mesh(geometry, buildingMaterial);
    building.position.set(pos.x, pos.h/2, pos.z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
  });
}

// パーティクルシステム
function createParticleSystem() {
  const particleCount = 500;
  const particles = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  
  for (let i = 0; i < particleCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 400,
      Math.random() * 300,
      (Math.random() - 0.5) * 400
    );
    
    const color = new THREE.Color();
    color.setHSL(0.1, 0.3, 0.6 + Math.random() * 0.4);
    colors.push(color.r, color.g, color.b);
  }
  
  particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  
  particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
}

// サグラダファミリア作成
function createSagradaFamilia() {
  // 基礎と地下聖堂
  createFoundations();
  
  // 生誕のファサード（詳細彫刻付き）
  createNativityFacadeDetailed();
  
  // 受難のファサード（詳細彫刻付き）
  createPassionFacadeDetailed();
  
  // 栄光のファサード
  createGloryFacade();
  
  // 身廊
  createNavesDetailed();
  
  // 中央塔群
  createCentralTowersDetailed();
  
  // ステンドグラス
  createStainedGlass();
  
  // 初期状態を設定
  updateConstruction(1882);
}

// 基礎（詳細版）
function createFoundations() {
  const foundationGroup = new THREE.Group();
  
  // 石積みの基礎
  for (let x = -50; x <= 50; x += 10) {
    for (let z = -40; z <= 40; z += 10) {
      const stoneGeometry = new THREE.BoxGeometry(
        9 + Math.random() * 2,
        4 + Math.random() * 2,
        9 + Math.random() * 2
      );
      
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterials.foundation.clone());
      stone.position.set(
        x + (Math.random() - 0.5) * 2,
        2,
        z + (Math.random() - 0.5) * 2
      );
      stone.rotation.y = Math.random() * 0.2;
      stone.castShadow = true;
      stone.receiveShadow = true;
      foundationGroup.add(stone);
    }
  }
  
  foundations = foundationGroup;
  sagradaGroup.add(foundationGroup);
}

// 生誕のファサード（詳細彫刻版）
function createNativityFacadeDetailed() {
  const facadeGroup = new THREE.Group();
  facadeGroup.position.set(50, 0, 0);
  
  // ファサード本体
  const facadeGeometry = new THREE.BoxGeometry(20, 60, 80);
  nativityFacade.facade = new THREE.Mesh(facadeGeometry, stoneMaterials.nativity.clone());
  nativityFacade.facade.position.y = 30;
  nativityFacade.facade.castShadow = true;
  nativityFacade.facade.receiveShadow = true;
  facadeGroup.add(nativityFacade.facade);
  
  // 聖家族の彫刻群
  createNativitySculptures(facadeGroup);
  
  // 4つの鐘塔
  const towerPositions = [
    { x: 0, z: -35, height: 107, name: 'Barnabas' },
    { x: 0, z: -12, height: 107, name: 'Simon' },
    { x: 0, z: 12, height: 107, name: 'Judas Tadeo' },
    { x: 0, z: 35, height: 107, name: 'Matias' }
  ];
  
  towerPositions.forEach((pos, index) => {
    const tower = createPhotoRealisticTower(stoneMaterials.nativity, pos.height, pos.name);
    tower.position.set(pos.x, 0, pos.z);
    tower.visible = false;
    nativityFacade.towers.push(tower);
    facadeGroup.add(tower);
  });
  
  sagradaGroup.add(facadeGroup);
}

// 生誕のファサードの彫刻
function createNativitySculptures(parent) {
  // 中央ポータル：キリストの誕生
  
  // 聖家族グループ
  const holyFamilyGroup = new THREE.Group();
  
  // マリア像（円柱と球で代替）
  const maryGroup = new THREE.Group();
  const maryBodyGeometry = new THREE.CylinderGeometry(2, 2.5, 8, 12);
  const maryHeadGeometry = new THREE.SphereGeometry(1.5, 12, 8);
  const maryMaterial = stoneMaterials.nativity.clone();
  maryMaterial.opacity = 0;
  
  const maryBody = new THREE.Mesh(maryBodyGeometry, maryMaterial);
  const maryHead = new THREE.Mesh(maryHeadGeometry, maryMaterial.clone());
  maryHead.position.y = 5;
  maryGroup.add(maryBody);
  maryGroup.add(maryHead);
  maryGroup.position.set(5, 15, 0);
  maryGroup.castShadow = true;
  holyFamilyGroup.add(maryGroup);
  
  // ヨセフ像（円柱と球で代替）
  const josephGroup = new THREE.Group();
  const josephBodyGeometry = new THREE.CylinderGeometry(2.2, 2.7, 9, 12);
  const josephHeadGeometry = new THREE.SphereGeometry(1.6, 12, 8);
  
  const josephBody = new THREE.Mesh(josephBodyGeometry, maryMaterial.clone());
  const josephHead = new THREE.Mesh(josephHeadGeometry, maryMaterial.clone());
  josephHead.position.y = 5.5;
  josephGroup.add(josephBody);
  josephGroup.add(josephHead);
  josephGroup.position.set(5, 16, -5);
  josephGroup.castShadow = true;
  holyFamilyGroup.add(josephGroup);
  
  // 幼子イエス（飼い葉桶）
  const jesusGeometry = new THREE.BoxGeometry(3, 1, 1.5);
  const jesus = new THREE.Mesh(jesusGeometry, maryMaterial.clone());
  jesus.position.set(5, 10, 2);
  jesus.castShadow = true;
  holyFamilyGroup.add(jesus);
  
  // 天使たち
  for (let i = 0; i < 6; i++) {
    const angelGeometry = new THREE.ConeGeometry(1, 4, 8);
    const angel = new THREE.Mesh(angelGeometry, maryMaterial.clone());
    const angle = (i / 6) * Math.PI * 2;
    angel.position.set(
      5 + Math.cos(angle) * 8,
      20 + Math.sin(i) * 3,
      Math.sin(angle) * 8
    );
    angel.rotation.z = Math.cos(angle) * 0.3;
    angel.castShadow = true;
    holyFamilyGroup.add(angel);
  }
  
  // 動物たち（牛、ロバ）
  const animalPositions = [
    { x: 10, y: 8, z: 5, scale: 1.2 },  // 牛
    { x: 10, y: 7, z: -3, scale: 0.8 }  // ロバ
  ];
  
  animalPositions.forEach(pos => {
    const animalGeometry = new THREE.BoxGeometry(4, 2, 2);
    const animal = new THREE.Mesh(animalGeometry, maryMaterial.clone());
    animal.position.set(pos.x, pos.y, pos.z);
    animal.scale.setScalar(pos.scale);
    animal.castShadow = true;
    holyFamilyGroup.add(animal);
  });
  
  // 生命の木（ファサード中央）
  const treeGeometry = new THREE.CylinderGeometry(0.5, 1, 25, 8);
  const treeMaterial = stoneMaterials.nativity.clone();
  const tree = new THREE.Mesh(treeGeometry, treeMaterial);
  tree.position.set(8, 25, 0);
  tree.castShadow = true;
  holyFamilyGroup.add(tree);
  
  // 動植物の装飾
  for (let i = 0; i < 30; i++) {
    const leafGeometry = new THREE.SphereGeometry(0.5, 6, 6);
    const leaf = new THREE.Mesh(leafGeometry, treeMaterial);
    leaf.position.set(
      5 + (Math.random() - 0.5) * 15,
      10 + Math.random() * 30,
      (Math.random() - 0.5) * 25
    );
    leaf.scale.setScalar(0.3 + Math.random() * 0.7);
    holyFamilyGroup.add(leaf);
  }
  
  nativityFacade.sculptures.push(holyFamilyGroup);
  parent.add(holyFamilyGroup);
  
  // 扉の装飾
  createNativityDoors(parent);
}

// 生誕のファサードの扉
function createNativityDoors(parent) {
  const doorPositions = [-25, 0, 25];
  
  doorPositions.forEach((z, index) => {
    const doorGroup = new THREE.Group();
    
    // 扉枠
    const frameGeometry = new THREE.TorusGeometry(8, 1, 8, 16, Math.PI);
    const frameMaterial = stoneMaterials.nativity.clone();
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(10, 15, z);
    frame.rotation.z = Math.PI;
    frame.castShadow = true;
    doorGroup.add(frame);
    
    // アーチの装飾
    for (let i = 0; i < 12; i++) {
      const decorGeometry = new THREE.SphereGeometry(0.8, 8, 8);
      const decor = new THREE.Mesh(decorGeometry, frameMaterial);
      const angle = (i / 12) * Math.PI;
      decor.position.set(
        10 + Math.cos(angle) * 9,
        15 + Math.sin(angle) * 9,
        z
      );
      doorGroup.add(decor);
    }
    
    // 扉の彫刻テーマ
    const themes = ['希望', '愛', '信仰'];
    const letterGeometry = new THREE.BoxGeometry(2, 1, 0.5);
    const letter = new THREE.Mesh(letterGeometry, frameMaterial);
    letter.position.set(8, 8, z);
    doorGroup.add(letter);
    
    parent.add(doorGroup);
  });
}

// 受難のファサード（詳細彫刻版）
function createPassionFacadeDetailed() {
  const facadeGroup = new THREE.Group();
  facadeGroup.position.set(-50, 0, 0);
  
  // ファサード本体（角ばったデザイン）
  const facadeGeometry = new THREE.BoxGeometry(20, 60, 80);
  passionFacade.facade = new THREE.Mesh(facadeGeometry, stoneMaterials.passion.clone());
  passionFacade.facade.position.y = 30;
  passionFacade.facade.castShadow = true;
  passionFacade.facade.receiveShadow = true;
  facadeGroup.add(passionFacade.facade);
  
  // スビラクスの彫刻群
  createPassionSculptures(facadeGroup);
  
  // 4つの鐘塔
  const towerPositions = [
    { x: 0, z: -35, height: 107, name: 'Santiago' },
    { x: 0, z: -12, height: 107, name: 'Bartolome' },
    { x: 0, z: 12, height: 107, name: 'Tomas' },
    { x: 0, z: 35, height: 107, name: 'Felipe' }
  ];
  
  towerPositions.forEach((pos, index) => {
    const tower = createPhotoRealisticTower(stoneMaterials.passion, pos.height, pos.name);
    tower.position.set(pos.x, 0, pos.z);
    tower.visible = false;
    passionFacade.towers.push(tower);
    facadeGroup.add(tower);
  });
  
  sagradaGroup.add(facadeGroup);
}

// 受難のファサードの彫刻（スビラクス風）
function createPassionSculptures(parent) {
  // 十字架の道行き場面
  
  // キリスト像（十字架を背負う）
  const christGroup = new THREE.Group();
  
  // キリストの体
  const christGeometry = new THREE.BoxGeometry(2, 8, 1.5);
  const christMaterial = stoneMaterials.passion.clone();
  christMaterial.opacity = 0;
  const christ = new THREE.Mesh(christGeometry, christMaterial);
  christ.position.set(-5, 15, 0);
  christ.rotation.x = 0.2; // 前かがみ
  christ.castShadow = true;
  christGroup.add(christ);
  
  // 十字架
  const crossVertical = new THREE.BoxGeometry(0.5, 12, 0.5);
  const crossHorizontal = new THREE.BoxGeometry(6, 0.5, 0.5);
  const crossMaterial = stoneMaterials.passion.clone();
  
  const crossV = new THREE.Mesh(crossVertical, crossMaterial);
  crossV.position.set(-3, 18, -2);
  crossV.rotation.x = 0.3;
  christGroup.add(crossV);
  
  const crossH = new THREE.Mesh(crossHorizontal, crossMaterial);
  crossH.position.set(-3, 20, -2);
  crossH.rotation.x = 0.3;
  christGroup.add(crossH);
  
  // 兵士たち（角ばった現代的デザイン）
  for (let i = 0; i < 4; i++) {
    const soldierGeometry = new THREE.BoxGeometry(1.5, 7, 1);
    const soldier = new THREE.Mesh(soldierGeometry, christMaterial.clone());
    soldier.position.set(
      -8 + i * 3,
      12,
      -10 + i * 5
    );
    soldier.rotation.y = (i - 2) * 0.5;
    soldier.castShadow = true;
    christGroup.add(soldier);
  }
  
  // ピラトの場面
  const pilateGeometry = new THREE.CylinderGeometry(1.5, 1.5, 8, 6);
  const pilate = new THREE.Mesh(pilateGeometry, christMaterial.clone());
  pilate.position.set(-5, 12, 15);
  pilate.castShadow = true;
  christGroup.add(pilate);
  
  // 群衆（簡略化された人々）
  for (let i = 0; i < 8; i++) {
    const crowdGeometry = new THREE.ConeGeometry(0.8, 6, 4);
    const crowd = new THREE.Mesh(crowdGeometry, christMaterial.clone());
    crowd.position.set(
      -10 + i * 2.5,
      9,
      10 + (i % 3) * 3
    );
    crowd.rotation.y = Math.random() * Math.PI;
    christGroup.add(crowd);
  }
  
  // 受難の道具（角ばったデザイン）
  const toolGeometries = [
    new THREE.BoxGeometry(3, 0.5, 8),  // 鞭
    new THREE.ConeGeometry(1, 5, 4),   // 槍
    new THREE.BoxGeometry(4, 4, 0.5)   // 看板
  ];
  
  toolGeometries.forEach((geometry, index) => {
    const tool = new THREE.Mesh(geometry, crossMaterial);
    tool.position.set(
      -2 + index * 4,
      25 + index * 2,
      -20 + index * 10
    );
    tool.rotation.set(
      Math.random() * 0.5,
      Math.random() * 0.5,
      Math.random() * 0.5
    );
    tool.castShadow = true;
    christGroup.add(tool);
  });
  
  passionFacade.sculptures.push(christGroup);
  parent.add(christGroup);
  
  // 数字の暗号（スビラクスの魔方陣）
  createMagicSquare(parent);
}

// 魔方陣（受難のファサードの特徴）
function createMagicSquare(parent) {
  const numbers = [
    [1, 14, 14, 4],
    [11, 7, 6, 9],
    [8, 10, 10, 5],
    [13, 2, 3, 15]
  ];
  
  const squareGroup = new THREE.Group();
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const numberGeometry = new THREE.BoxGeometry(2, 2, 0.5);
      const numberMaterial = stoneMaterials.passion.clone();
      const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
      
      numberMesh.position.set(
        -3 + col * 2,
        35 - row * 2,
        -30
      );
      numberMesh.castShadow = true;
      squareGroup.add(numberMesh);
    }
  }
  
  squareGroup.position.set(-8, 0, 0);
  parent.add(squareGroup);
}

// 栄光のファサード
function createGloryFacade() {
  // 簡略版（まだ建設中のため）
  const facadeGroup = new THREE.Group();
  facadeGroup.position.set(0, 0, 45);
  facadeGroup.rotation.y = Math.PI / 2;
  
  const facadeGeometry = new THREE.BoxGeometry(20, 70, 100);
  const facadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x4169e1,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0
  });
  
  gloryFacade.facade = new THREE.Mesh(facadeGeometry, facadeMaterial);
  gloryFacade.facade.position.y = 35;
  gloryFacade.facade.castShadow = true;
  facadeGroup.add(gloryFacade.facade);
  
  sagradaGroup.add(facadeGroup);
}

// 身廊（詳細版）
function createNavesDetailed() {
  const naveGroup = new THREE.Group();
  
  // メイン身廊
  const naveGeometry = new THREE.BoxGeometry(90, 70, 70);
  const naveMaterial = new THREE.MeshStandardMaterial({
    color: 0xa08060,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0
  });
  
  naves = new THREE.Mesh(naveGeometry, naveMaterial);
  naves.position.y = 35;
  naves.castShadow = true;
  naves.receiveShadow = true;
  naveGroup.add(naves);
  
  // 森の柱（ガウディの自然主義）
  createForestColumns(naveGroup);
  
  sagradaGroup.add(naveGroup);
}

// 森の柱
function createForestColumns(parent) {
  const columnPositions = [
    { x: -30, z: -25 }, { x: -30, z: 0 }, { x: -30, z: 25 },
    { x: 0, z: -25 }, { x: 0, z: 25 },
    { x: 30, z: -25 }, { x: 30, z: 0 }, { x: 30, z: 25 }
  ];
  
  columnPositions.forEach(pos => {
    const columnGroup = new THREE.Group();
    
    // 主幹
    const trunkGeometry = new THREE.CylinderGeometry(2, 4, 50, 12);
    const trunkMaterial = stoneMaterials.foundation.clone();
    trunkMaterial.opacity = 0;
    
    // 幹に螺旋の装飾
    const positions = trunkGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const angle = y * 0.1;
      
      positions.setX(i, x + Math.sin(angle) * 0.5);
      positions.setZ(i, z + Math.cos(angle) * 0.5);
    }
    trunkGeometry.computeVertexNormals();
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 25;
    trunk.castShadow = true;
    columnGroup.add(trunk);
    
    // 枝分かれ
    for (let i = 0; i < 6; i++) {
      const branchGeometry = new THREE.CylinderGeometry(0.8, 1.5, 20, 8);
      const branch = new THREE.Mesh(branchGeometry, trunkMaterial.clone());
      
      const angle = (i / 6) * Math.PI * 2;
      const elevation = Math.PI / 6;
      
      branch.position.set(
        Math.cos(angle) * 12,
        40,
        Math.sin(angle) * 12
      );
      branch.rotation.z = Math.cos(angle) * elevation;
      branch.rotation.x = Math.sin(angle) * elevation;
      branch.castShadow = true;
      columnGroup.add(branch);
      
      // 葉（小さなファン）
      for (let j = 0; j < 4; j++) {
        const leafGeometry = new THREE.ConeGeometry(2, 1, 6);
        const leaf = new THREE.Mesh(leafGeometry, trunkMaterial.clone());
        leaf.position.set(
          Math.cos(angle) * (15 + j * 2),
          42 + j,
          Math.sin(angle) * (15 + j * 2)
        );
        leaf.scale.setScalar(0.5);
        columnGroup.add(leaf);
      }
    }
    
    columnGroup.position.set(pos.x, 0, pos.z);
    parent.add(columnGroup);
  });
}

// 中央塔群（フォトリアル版）
function createCentralTowersDetailed() {
  // イエスの塔（172.5m）
  centralTowers.jesus = createPhotoRealisticTower(stoneMaterials.central, 172.5, 'jesus', 18);
  centralTowers.jesus.position.set(0, 0, 0);
  centralTowers.jesus.visible = false;
  
  // 頂上の十字架
  const crossGroup = createDetailedCross();
  crossGroup.position.y = 180;
  centralTowers.jesus.add(crossGroup);
  
  sagradaGroup.add(centralTowers.jesus);
  
  // マリアの塔（138m）
  centralTowers.mary = createPhotoRealisticTower(stoneMaterials.central, 138, 'mary', 14);
  centralTowers.mary.position.set(0, 0, -30);
  centralTowers.mary.visible = false;
  
  // 星の装飾
  const starGroup = createDetailedStar();
  starGroup.position.y = 145;
  centralTowers.mary.add(starGroup);
  
  sagradaGroup.add(centralTowers.mary);
  
  // 福音書記者の塔
  const evangelistData = [
    { x: 25, z: 20, name: 'matthew', symbol: 'angel' },
    { x: -25, z: 20, name: 'mark', symbol: 'lion' },
    { x: 25, z: -20, name: 'luke', symbol: 'bull' },
    { x: -25, z: -20, name: 'john', symbol: 'eagle' }
  ];
  
  evangelistData.forEach(data => {
    const tower = createPhotoRealisticTower(stoneMaterials.central, 135, data.name, 12);
    tower.position.set(data.x, 0, data.z);
    tower.visible = false;
    
    // 各福音書記者のシンボル
    const symbolGroup = createEvangelistSymbol(data.symbol);
    symbolGroup.position.y = 140;
    tower.add(symbolGroup);
    
    centralTowers.evangelists.push(tower);
    sagradaGroup.add(tower);
  });
}

// フォトリアルな塔
function createPhotoRealisticTower(material, height, name, radius = 8) {
  const towerGroup = new THREE.Group();
  towerGroup.name = name;
  
  const segments = Math.floor(height / 15);
  
  for (let i = 0; i < segments; i++) {
    const segmentHeight = 15;
    const progress = i / segments;
    const bottomRadius = radius * (1 - progress * 0.7);
    const topRadius = radius * (1 - (progress + 1/segments) * 0.7);
    
    // より複雑な形状
    const segmentGeometry = new THREE.CylinderGeometry(
      topRadius,
      bottomRadius,
      segmentHeight,
      16 + Math.floor(progress * 8),
      3
    );
    
    // 石積みのディテール
    const positions = segmentGeometry.attributes.position;
    for (let j = 0; j < positions.count; j++) {
      const x = positions.getX(j);
      const y = positions.getY(j);
      const z = positions.getZ(j);
      
      // 螺旋パターン
      const angle = Math.atan2(z, x) + (y / segmentHeight) * Math.PI * 0.5;
      const spiralOffset = Math.sin(angle * 8) * 0.2;
      
      // 石の積み重ね感
      const stoneLayer = Math.floor((y + segmentHeight/2) / 3);
      const stoneOffset = (stoneLayer % 2) * 0.5;
      
      const distance = Math.sqrt(x * x + z * z);
      const newDistance = distance + spiralOffset + Math.sin(angle * 16) * 0.1;
      
      positions.setX(j, (x / distance) * newDistance + stoneOffset * 0.1);
      positions.setZ(j, (z / distance) * newDistance);
      positions.setY(j, y + Math.sin(angle * 12) * 0.1);
    }
    segmentGeometry.computeVertexNormals();
    
    const segmentMaterial = material.clone();
    segmentMaterial.opacity = 0;
    
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
    segment.position.y = i * segmentHeight + segmentHeight / 2;
    segment.castShadow = true;
    segment.receiveShadow = true;
    towerGroup.add(segment);
    
    // 装飾リング
    if (i % 4 === 0) {
      const ringGeometry = new THREE.TorusGeometry(bottomRadius + 1, 0.5, 8, 16);
      const ring = new THREE.Mesh(ringGeometry, segmentMaterial.clone());
      ring.position.y = i * segmentHeight;
      towerGroup.add(ring);
    }
    
    // 窓
    if (i > segments * 0.3 && i % 3 === 1) {
      for (let w = 0; w < 4; w++) {
        const windowAngle = (w / 4) * Math.PI * 2;
        const windowGeometry = new THREE.BoxGeometry(2, 4, 1);
        const windowMaterial = new THREE.MeshStandardMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.9
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
          Math.cos(windowAngle) * (bottomRadius + 0.5),
          i * segmentHeight + segmentHeight / 2,
          Math.sin(windowAngle) * (bottomRadius + 0.5)
        );
        window.lookAt(
          window.position.x * 2,
          window.position.y,
          window.position.z * 2
        );
        towerGroup.add(window);
      }
    }
  }
  
  return towerGroup;
}

// 詳細な十字架
function createDetailedCross() {
  const crossGroup = new THREE.Group();
  
  const crossMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffd700,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.7
  });
  
  // 縦の梁
  const verticalGeometry = new THREE.BoxGeometry(3, 25, 3);
  const vertical = new THREE.Mesh(verticalGeometry, crossMaterial);
  vertical.position.y = 5;
  crossGroup.add(vertical);
  
  // 横の梁
  const horizontalGeometry = new THREE.BoxGeometry(15, 3, 3);
  const horizontal = new THREE.Mesh(horizontalGeometry, crossMaterial);
  horizontal.position.y = 0;
  crossGroup.add(horizontal);
  
  // 装飾
  const decorGeometry = new THREE.SphereGeometry(2, 8, 8);
  const decors = [
    { x: 0, y: 10, z: 0 },   // 頂上
    { x: -6, y: 0, z: 0 },   // 左
    { x: 6, y: 0, z: 0 },    // 右
    { x: 0, y: -5, z: 0 }    // 下
  ];
  
  decors.forEach(pos => {
    const decor = new THREE.Mesh(decorGeometry, crossMaterial);
    decor.position.set(pos.x, pos.y, pos.z);
    crossGroup.add(decor);
  });
  
  // 光のエフェクト
  const light = new THREE.PointLight(0xffd700, 1, 50);
  light.position.y = 5;
  crossGroup.add(light);
  
  return crossGroup;
}

// 詳細な星
function createDetailedStar() {
  const starGroup = new THREE.Group();
  
  const starMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x87ceeb,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.9
  });
  
  // 8角星
  const starShape = new THREE.Shape();
  const points = 8;
  const outerRadius = 6;
  const innerRadius = 3;
  
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      starShape.moveTo(x, y);
    } else {
      starShape.lineTo(x, y);
    }
  }
  
  const starGeometry = new THREE.ExtrudeGeometry(starShape, {
    depth: 2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 0.5,
    bevelThickness: 0.5
  });
  
  const star = new THREE.Mesh(starGeometry, starMaterial);
  star.rotation.x = Math.PI / 2;
  starGroup.add(star);
  
  // 光のエフェクト
  const starLight = new THREE.PointLight(0x87ceeb, 2, 100);
  starGroup.add(starLight);
  
  // 回転アニメーション
  starGroup.userData.animate = true;
  
  return starGroup;
}

// 福音書記者のシンボル
function createEvangelistSymbol(type) {
  const symbolGroup = new THREE.Group();
  
  const symbolMaterial = new THREE.MeshStandardMaterial({
    color: 0xe6c060,
    emissive: 0xe6c060,
    emissiveIntensity: 0.2,
    roughness: 0.4,
    metalness: 0.6
  });
  
  let symbolGeometry;
  switch(type) {
    case 'angel': // マタイ
      symbolGeometry = new THREE.ConeGeometry(3, 6, 8);
      break;
    case 'lion': // マルコ
      symbolGeometry = new THREE.BoxGeometry(5, 3, 6);
      break;
    case 'bull': // ルカ
      symbolGeometry = new THREE.CylinderGeometry(2, 3, 4, 8);
      break;
    case 'eagle': // ヨハネ
      symbolGeometry = new THREE.SphereGeometry(2.5, 8, 8);
      break;
    default:
      symbolGeometry = new THREE.OctahedronGeometry(3);
  }
  
  const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
  symbolGroup.add(symbol);
  
  return symbolGroup;
}

// ステンドグラス（詳細版）
function createStainedGlass() {
  const glassData = [
    { x: 45, y: 35, z: -25, color: 0xff0000, pattern: 'rose' },
    { x: 45, y: 35, z: 0, color: 0x00ff00, pattern: 'tree' },
    { x: 45, y: 35, z: 25, color: 0x0000ff, pattern: 'cross' },
    { x: -45, y: 35, z: -25, color: 0xffff00, pattern: 'star' },
    { x: -45, y: 35, z: 0, color: 0xff00ff, pattern: 'dove' },
    { x: -45, y: 35, z: 25, color: 0x00ffff, pattern: 'fish' }
  ];
  
  glassData.forEach(data => {
    const glassGroup = new THREE.Group();
    
    // ガラス面
    const glassGeometry = new THREE.PlaneGeometry(10, 18);
    const glassMaterial = new THREE.MeshPhongMaterial({
      color: data.color,
      transparent: true,
      opacity: 0,  // 初期状態は完全透明
      emissive: data.color,
      emissiveIntensity: 0,  // 初期状態は発光なし
      side: THREE.DoubleSide
    });
    
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(data.x, data.y, data.z);
    glass.rotation.y = data.x > 0 ? Math.PI / 2 : -Math.PI / 2;
    
    // 鉛の枠
    const frameGeometry = new THREE.BoxGeometry(0.2, 18, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // 縦の枠
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.position.set(data.x, data.y, data.z + (i - 1) * 5);
      frame.rotation.y = data.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      glassGroup.add(frame);
    }
    
    // 横の枠
    const hFrameGeometry = new THREE.BoxGeometry(0.2, 0.2, 10);
    for (let i = 0; i < 4; i++) {
      const frame = new THREE.Mesh(hFrameGeometry, frameMaterial);
      frame.position.set(data.x, data.y + (i - 1.5) * 6, data.z);
      frame.rotation.y = data.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      glassGroup.add(frame);
    }
    
    glassGroup.add(glass);
    stainedGlassWindows.push(glassGroup);
    sagradaGroup.add(glassGroup);
  });
}

// 建設状態を更新（フォトリアル版）
function updateConstruction(year) {
  // 基礎（1882-1889）
  if (year >= 1882 && foundations.children) {
    const foundationProgress = Math.min(1, (year - 1882) / 7);
    foundations.children.forEach((stone, index) => {
      if (foundationProgress * foundations.children.length > index) {
        stone.material.opacity = Math.min(1, (foundationProgress * foundations.children.length - index) * 2);
      }
    });
  }
  
  // 生誕のファサード（1900-1930）
  if (year >= 1900) {
    const facadeProgress = Math.min(1, (year - 1900) / 30);
    nativityFacade.facade.material.opacity = facadeProgress;
    
    // 彫刻の段階的表示
    nativityFacade.sculptures.forEach((sculpture, index) => {
      if (year >= 1905 + index * 3) {
        sculpture.children.forEach((element, elemIndex) => {
          if (element.isMesh) {
            const elemProgress = Math.min(1, (year - (1905 + index * 3 + elemIndex * 0.5)) / 2);
            element.material.opacity = Math.max(0, elemProgress);
          }
        });
      }
    });
    
    // 塔の建設
    nativityFacade.towers.forEach((tower, index) => {
      if (year >= 1915 + index * 3) {
        tower.visible = true;
        const towerProgress = Math.min(1, (year - (1915 + index * 3)) / 8);
        
        tower.children.forEach((segment, segIndex) => {
          if (segment.isMesh && segment.material) {
            const segProgress = Math.min(1, towerProgress * tower.children.length - segIndex);
            segment.material.opacity = Math.max(0, segProgress);
            segment.scale.y = Math.max(0.1, segProgress);
          }
        });
      }
    });
  }
  
  // 受難のファサード（1954-1986）
  if (year >= 1954) {
    const facadeProgress = Math.min(1, (year - 1954) / 32);
    passionFacade.facade.material.opacity = facadeProgress;
    
    // スビラクスの彫刻（1986年以降）
    if (year >= 1986) {
      passionFacade.sculptures.forEach((sculpture, index) => {
        sculpture.children.forEach((element, elemIndex) => {
          if (element.isMesh) {
            const elemProgress = Math.min(1, (year - (1986 + elemIndex * 0.2)) / 1);
            element.material.opacity = Math.max(0, elemProgress);
          }
        });
      });
    }
    
    // 塔の建設
    passionFacade.towers.forEach((tower, index) => {
      if (year >= 1960 + index * 4) {
        tower.visible = true;
        const towerProgress = Math.min(1, (year - (1960 + index * 4)) / 10);
        
        tower.children.forEach((segment, segIndex) => {
          if (segment.isMesh && segment.material) {
            const segProgress = Math.min(1, towerProgress * tower.children.length - segIndex);
            segment.material.opacity = Math.max(0, segProgress);
            segment.scale.y = Math.max(0.1, segProgress);
          }
        });
      }
    });
  }
  
  // 身廊（2000-2010）
  if (year >= 2000) {
    const naveProgress = Math.min(1, (year - 2000) / 10);
    naves.material.opacity = naveProgress;
    
    // ステンドグラス
    stainedGlassWindows.forEach((window, index) => {
      if (year >= 2005 + index * 0.5) {
        window.children.forEach(child => {
          if (child.material && child.material.transparent) {
            const progress = Math.min(1, (year - (2005 + index * 0.5)) / 2);
            child.material.opacity = Math.min(0.7, progress);
            if (child.material.emissive) {
              child.material.emissiveIntensity = progress * 0.3;
            }
          }
        });
      }
    });
  }
  
  // 中央塔群（2016-2026）
  if (year >= 2016) {
    // マリアの塔
    if (year >= 2016) {
      centralTowers.mary.visible = true;
      const maryProgress = Math.min(1, (year - 2016) / 4);
      
      centralTowers.mary.children.forEach((segment, index) => {
        if (segment.isMesh && segment.material) {
          const segProgress = Math.min(1, maryProgress * centralTowers.mary.children.length - index);
          segment.material.opacity = Math.max(0, segProgress);
        }
      });
    }
    
    // イエスの塔（2020-2026）
    if (year >= 2020) {
      centralTowers.jesus.visible = true;
      const jesusProgress = Math.min(1, (year - 2020) / 6);
      
      centralTowers.jesus.children.forEach((segment, index) => {
        if (segment.isMesh && segment.material) {
          const segProgress = Math.min(1, jesusProgress * centralTowers.jesus.children.length - index);
          segment.material.opacity = Math.max(0, segProgress);
        }
      });
    }
    
    // 福音書記者の塔（2021-2026）
    centralTowers.evangelists.forEach((tower, towerIndex) => {
      if (year >= 2021 + towerIndex) {
        tower.visible = true;
        const towerProgress = Math.min(1, (year - (2021 + towerIndex)) / 3);
        
        tower.children.forEach((segment, segIndex) => {
          if (segment.isMesh && segment.material) {
            const segProgress = Math.min(1, towerProgress * tower.children.length - segIndex);
            segment.material.opacity = Math.max(0, segProgress);
          }
        });
      }
    });
  }
  
  // 栄光のファサード（2005-2026、ゆっくり）
  if (year >= 2005) {
    const gloryProgress = Math.min(1, (year - 2005) / 21);
    gloryFacade.facade.material.opacity = gloryProgress * 0.5; // まだ半分程度
  }
}

// UIの更新
function updateUI(year) {
  document.getElementById('year-display').textContent = Math.round(year);
  
  let currentPhase = constructionPhases[0];
  for (let phase of constructionPhases) {
    if (year >= phase.year) {
      currentPhase = phase;
    } else {
      break;
    }
  }
  
  document.getElementById('phase-display').textContent = 
    currentPhase.phase + " - " + currentPhase.description;
}

// イベントリスナー設定
function setupEventListeners() {
  const timeline = document.getElementById('timeline');
  timeline.addEventListener('input', (e) => {
    targetYear = parseFloat(e.target.value);
    updateConstruction(targetYear);
    updateUI(targetYear);
  });
  
  window.addEventListener('resize', onWindowResize);
}

// ウィンドウリサイズ処理
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  controls.update();
  
  if (isAnimating) {
    targetYear += animationSpeed;
    if (targetYear > 2026) {
      targetYear = 2026;
      isAnimating = false;
    }
    document.getElementById('timeline').value = targetYear;
    updateConstruction(targetYear);
    updateUI(targetYear);
  }
  
  // 微妙な回転
  sagradaGroup.rotation.y += 0.0001;
  
  // 星の回転アニメーション
  if (centralTowers.mary && centralTowers.mary.visible) {
    const starGroup = centralTowers.mary.children.find(child => child.userData.animate);
    if (starGroup) {
      starGroup.rotation.z += 0.005;
    }
  }
  
  // パーティクルアニメーション
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(Date.now() * 0.0005 + i) * 0.02;
      
      // 範囲外に出たら再配置
      if (positions[i + 1] > 300) {
        positions[i + 1] = 0;
        positions[i] = (Math.random() - 0.5) * 400;
        positions[i + 2] = (Math.random() - 0.5) * 400;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }
  
  renderer.render(scene, camera);
}

// コントロール関数
function toggleAnimation() {
  isAnimating = !isAnimating;
  if (isAnimating && targetYear >= 2026) {
    targetYear = 1882;
  }
}

function resetTimeline() {
  targetYear = 1882;
  document.getElementById('timeline').value = targetYear;
  updateConstruction(targetYear);
  updateUI(targetYear);
  isAnimating = false;
}

function changeView(view) {
  const duration = 1500;
  const startPos = camera.position.clone();
  const startTime = Date.now();
  
  let targetPos;
  let targetLookAt = new THREE.Vector3(0, 50, 0);
  
  switch(view) {
    case 'front':
      targetPos = new THREE.Vector3(0, 100, 350);
      break;
    case 'aerial':
      targetPos = new THREE.Vector3(0, 400, 200);
      break;
    case 'side':
      targetPos = new THREE.Vector3(350, 100, 0);
      break;
    case 'interior':
      // 内部ビュー（身廊の中央から見上げる）
      targetPos = new THREE.Vector3(0, 30, 0);
      targetLookAt = new THREE.Vector3(0, 100, 0);
      break;
    case 'interior-east':
      // 東側（生誕のファサード側）のステンドグラスを見る
      targetPos = new THREE.Vector3(20, 35, 0);
      targetLookAt = new THREE.Vector3(45, 35, 0);
      break;
    case 'interior-west':
      // 西側（受難のファサード側）のステンドグラスを見る
      targetPos = new THREE.Vector3(-20, 35, 0);
      targetLookAt = new THREE.Vector3(-45, 35, 0);
      break;
  }
  
  const startLookAt = controls.target.clone();
  
  function updateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const eased = 1 - Math.pow(1 - progress, 3);
    
    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.target.lerpVectors(startLookAt, targetLookAt, eased);
    controls.update();
    
    if (progress < 1) {
      requestAnimationFrame(updateCamera);
    }
  }
  
  updateCamera();
}

// 初期化実行
window.addEventListener('DOMContentLoaded', init);