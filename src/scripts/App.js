import { PerspectiveCamera, Scene, WebGLRenderer, AmbientLight, BufferAttribute, Color } from 'three';
// import { Mesh, MeshBasicMaterial, TubeGeometry } from 'three';
import { CatmullRomCurve3 } from 'three';
// import { Vector3 } from 'three';
import { Line, BufferGeometry } from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { BloomEffect, EffectComposer, EffectPass, SMAAEffect, SMAAImageLoader, SMAAPreset, EdgeDetectionMode, BlendFunction, KernelSize, RenderPass } from "postprocessing";
import { Pane } from 'tweakpane';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { pointsFromBufferGeometry } from './Utils';
import LineGradientMaterial from './LineGradientMaterial';
import Shape from '/public/shoe.gltf';
// TODO : essayer format OBJ pour faciliter l'import ou faire une loupe pour récupérer le premier mesh dispo du gltf
class App {
  /**
   * [constructor description]
   */
  constructor() {
    this.params = {
      // backgroundColor: 0xffffff,
      // startColor: 0xff0000,
      // middleColor: 0x00ff00,
      // endColor: 0x0000ff,
      backgroundColor: 0x091353,
      startColor: 0x9D84B7,
      middleColor: 0xD5D5D5,
      endColor: 0xB2F9FC,
      distance: .2,
      scale: 100,
      speed: .005,
    };

    this.initThree();
    this.initPost();
    this.initScene();
    this.initCurve();
    this.initPane();
  }

  /**
   * [initThree description]
   */
  initThree = () => {
    this.camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    this.camera.position.z = 1.2;
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animation);
    this.renderer.setClearColor(0x000000, 0);
    document.body.appendChild(this.renderer.domElement);
    this.backgroundColor = new Color(this.params.backgroundColor);
    document.body.style.backgroundColor = `#${this.backgroundColor.getHexString()}`;
    window.addEventListener('resize', throttle(this.resize, 100), false);
  }

  /**
   * [initPost description]
   */
  initPost = () => {
    const smaaImageLoader = new SMAAImageLoader();
    smaaImageLoader.load(([search, area]) => {
      const smaaEffect = new SMAAEffect(
        search,
        area,
        SMAAPreset.HIGH,
        EdgeDetectionMode.COLOR
      );
      smaaEffect.edgeDetectionMaterial.setEdgeDetectionThreshold(0.01);
      this.composer = new EffectComposer(this.renderer);
      // this.composer.multisampling = Math.min(4, this.renderer.getContext().getParameter(this.renderer.getContext().MAX_SAMPLES));
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      const bloomEffect = new BloomEffect({
        blendFunction: BlendFunction.SCREEN,
        kernelSize: KernelSize.MEDIUM,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.1,
        height: 480
      });
      const bloomEffectPass = new EffectPass(this.camera, smaaEffect, bloomEffect);
      bloomEffectPass.renderToScreen = true;
      this.composer.addPass(bloomEffectPass);
    });
  }

  /**
   * [initScene description]
   */
  initScene = () => {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.autoRotate = true;
    const light = new AmbientLight(0xffffff);
    this.scene.add(light);
  }

  /**
   * [initCurve description]
   */
  initCurve = () => {
    // load shape
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader( dracoLoader );
    loader.load(
      Shape,
      (gltf) => {
        document.querySelector('.loading').style.display = 'none';
        this.shape = gltf.scene.children[0].children[0].children[0];
        console.log(this.shape);
        // this.scene.add( gltf.scene );
        this.generateCurve();
      },
      (xhr) => {
        console.log(( xhr.loaded / xhr.total * 100 ) + '% loaded');
      },
      (error) => {
        console.log('An error happened', error);
      }
    );
  }

  /**
   * [initPane description]
   */
  initPane = () => {
    const pane = new Pane();
    const updateMaterial = () => {
      this.backgroundColor.set(this.params.backgroundColor);
      document.body.style.backgroundColor = `#${this.backgroundColor.getHexString()}`;
      if (this.curveMaterial) {
        this.curveMaterial.startColor = this.params.startColor;
        this.curveMaterial.middleColor = this.params.middleColor;
        this.curveMaterial.endColor = this.params.endColor;
        this.curveMaterial.scale = this.params.scale;
      }
    };
    const folder = pane.addFolder({
      title: 'Params',
    });
    folder.addInput(this.params, 'backgroundColor', { view: 'color' }).on('change', updateMaterial);
    folder.addInput(this.params, 'startColor', { view: 'color' }).on('change', updateMaterial);
    folder.addInput(this.params, 'middleColor', { view: 'color' }).on('change', updateMaterial);
    folder.addInput(this.params, 'endColor', { view: 'color' }).on('change', updateMaterial);
    folder.addInput(this.params, 'distance', {min: 0, max: 1, step: 0.01}).on('change', debounce(this.generateCurve, 20));
    folder.addInput(this.params, 'scale', {min: 1, max: 250, step: 1}).on('change', updateMaterial);
    folder.addInput(this.params, 'speed', {min: 0, max: .01, step: .001});
  }

  /**
   * [generateCurve description]
   */
  generateCurve = () => {
    if (!this.shape) return;
    // get quads center points
    const points = [];
    pointsFromBufferGeometry(this.shape.geometry, points);
    // remove points too close from previous one
    const filteredPoints = [];
    for (let i = 0, len = points.length; i < len; i++) {
      if (i > 0) {
        const distanceFromPreviousPoint = points[i].distanceTo(points[i - 1]);
        if (Math.abs(distanceFromPreviousPoint) < this.params.distance) {
          continue;
        }
      }
      filteredPoints.push(points[i]);
    }
    const curve = new CatmullRomCurve3(filteredPoints, false);
    // const fakePoints = [
    //   new Vector3(-1, 0, 0),
    //   new Vector3(1, 0, 0),
    // ];
    // const curve = new CatmullRomCurve3(fakePoints, false);
    // create geometry
    if (this.curveGeometry)
      this.curveGeometry.dispose();
    const curvePoints = curve.getPoints(filteredPoints.length * 100, false);
    this.curveGeometry = new BufferGeometry().setFromPoints(curvePoints);
    // add percent position on the line for each vertices
    const percents = [];
    for (let i = 0, len = this.curveGeometry.attributes.position.count; i < len; i++) {
      percents.push(i / (len - 1));
    }
    this.curveGeometry.setAttribute( 'percent', new BufferAttribute( new Float32Array(percents), 1 ) );
    // update or create mesh
    if (this.curveMesh)
      this.curveMesh.geometry = this.curveGeometry;
    else {
      this.curveMaterial = new LineGradientMaterial({
        time: 0,
        scale: this.params.scale,
        startColor: this.params.startColor,
        middleColor: this.params.middleColor,
        endColor: this.params.endColor
      });
      this.curveMesh = new Line(this.curveGeometry, this.curveMaterial);
      this.curveMesh.position.y = .2;
      // this.curveMesh.rotation.x = Math.PI * .2;
      this.curveMesh.rotation.y = - Math.PI * .2;
      this.scene.add(this.curveMesh);
    }
    // if (this.curveGeometry)
    //   this.curveGeometry.dispose();
    // this.curveGeometry = new TubeGeometry(curve, filteredPoints.length * 50, .002, 10, false);
    // if (this.curveMesh)
    //   this.curveMesh.geometry = this.curveGeometry;
    // else {
    //   this.curveMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
    //   this.curveMesh = new Mesh(this.curveGeometry, this.curveMaterial);
    //   this.scene.add(this.curveMesh);
    // }
  }

  /**
   * [animation description]
   * @param  {[type]} time [description]
   */
  animation = () => {
    this.controls.update();
    if (this.curveMaterial)
      this.curveMaterial.time = this.curveMaterial.time + this.params.speed < 1 ? this.curveMaterial.time + this.params.speed : 0;
      // this.curveMaterial.time = Date.now() / 1000;
    // this.renderer.render(this.scene, this.camera);
    this.composer?.render();
  }

  /**
   * [resize description]
   */
  resize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.composer?.setSize( window.innerWidth, window.innerHeight );
  }
}

export default App;
