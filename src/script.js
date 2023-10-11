import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'


import { CopyShader } from './Utils/CopyShader.js';
import createFloor from './Utils/createFloor.js'

THREE.ColorManagement.enabled = false
/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}
const parameters = { strength: 1000 }
debugObject.createSphere = () => {
    const radius = Math.random() * 0.5
    const position = {
        x: (Math.random() - 0.5) * 3,
        y: 2.5,
        z: (Math.random() - 0.5) * 3
    }
    createSphere(radius, position)
}
debugObject.createBox = () => {
    const width = Math.random() * 0.75
    const height = Math.random() * 0.75
    const depth = Math.random() * 0.75
    const position = {
        x: (Math.random() - 0.5) * 3,
        y: 3,
        z: (Math.random() - 0.5) * 3
    }
    createBox(width, height, depth, position)
}
debugObject.reset = () => {
    for(const object of objectsToUpdate) {
        removeObject(object)
    }
}
gui.add(debugObject, 'createSphere')
gui.add(debugObject, 'createBox')
gui.add(debugObject, 'reset')
gui.add(parameters, 'strength').min(1).max(5000)

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
const sceneCube = new THREE.Scene()

/*
    Raycaster
*/
const raycaster = new THREE.Raycaster()

/*
    Mouse
*/
const mouse = new THREE.Vector2()
window.addEventListener('mousemove', (_event) => {
    mouse.x = (_event.clientX / sizes.width) * 2 - 1
    mouse.y = - (_event.clientY / sizes.height) * 2 + 1
})
window.addEventListener('click', () => {
    if(currentIntersect) {
        const currentObject = objectsToUpdate.filter(object => {
            return object.mesh.id == currentIntersect.object.id
        })[0]
        const body = currentObject.body

        let cameraDirection = new THREE.Vector3()
        let center = new CANNON.Vec3(0, 0, 0)
        camera.getWorldDirection(cameraDirection).multiplyScalar(parameters.strength)

        cameraDirection.y = 0
        body.sleepState = 0
        body.applyForce(cameraDirection, center)
    }
})

/*
    Sounds
*/
const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (collisionEvent) => {
    const impactStrength = collisionEvent.contact.getImpactVelocityAlongNormal()
    if(impactStrength > 1.5) {
        hitSound.volume = Math.min(impactStrength/10, 1)
        hitSound.currentTime = 0
        hitSound.play()
    }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/*
Physics
*/
// World
const world = new CANNON.World()
const earthGravity = [0, -9.82, 0]
world.broadphase = new CANNON.SAPBroadphase(world)
world.maxS
world.allowSleep = true

world.gravity.set(...earthGravity)

// Materials
const defaultMaterial = new CANNON.Material('default')

const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.05,
        restitution: 1.1
    }
)

gui.add(defaultContactMaterial, 'restitution').min(0).max(1.5).name('bounce')

world.defaultContactMaterial = defaultContactMaterial
world.addContactMaterial(defaultContactMaterial)

// create floors
const faces = [
    {
        position: new CANNON.Vec3(0, 0, 0),
        rotation: {
            axes: new CANNON.Vec3(-1, 0, 0),
            value: Math.PI * 0.5
        }
    },
    {
        position: new CANNON.Vec3(0, 1, 1),
        rotation: {
            axes: new CANNON.Vec3(0, 1, 0),
            value: Math.PI 
        }
    },
    {
        position: new CANNON.Vec3(0, 1, -1),
        rotation: {
            axes: new CANNON.Vec3(0, 1, 0),
            value: Math.PI
        }
    },
    {
        position: new CANNON.Vec3(1, 1, 0),
        rotation: {
            axes: new CANNON.Vec3(0, 1, 0),
            value: Math.PI * 0.5
        }
    },
    {
        position: new CANNON.Vec3(-1, 1, 0),
        rotation: {
            axes: new CANNON.Vec3(0, -1, 0),
            value: Math.PI * 0.5
        }
    },
    { 
        position: new CANNON.Vec3(0, 2, 0),
        rotation: {
            axes: new CANNON.Vec3(-1, 0, 0),
            value: Math.PI * 0.5
        }
    },
]

faces.forEach((face) => {
    createFloor(world, sceneCube, environmentMapTexture, face.position, face.rotation)    
})

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

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

    // Update composer
    composer.setSize( sizes.width, sizes.height );
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 4, 5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/*
    Composer
*/
const clearPass = new ClearPass()

const renderPass  = new RenderPass(scene, camera)
renderPass.clear = false
const renderCubePass = new RenderPass(sceneCube, camera)
renderCubePass.clear = false

const afterimagePass = new AfterimagePass(0.9)

const outputPass = new ShaderPass(CopyShader)
outputPass.renderToScreen = true

const composer = new EffectComposer(renderer)
composer.setSize(sizes.width, sizes.height)

composer.addPass(clearPass)
composer.addPass(renderPass)
composer.addPass(renderCubePass)
composer.addPass(afterimagePass)
composer.addPass(outputPass)

/*
    Utils
*/

const regularMaterialConfig = {
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    userData: {id: 0}
}
const yellowMaterial = new THREE.MeshStandardMaterial({
    ...regularMaterialConfig,
    color: 'yellow'
})
const blueMaterial = new THREE.MeshStandardMaterial({
    ...regularMaterialConfig,
    color: 'blue'
})
const purpleMaterial = new THREE.MeshStandardMaterial({
    ...regularMaterialConfig,
    color: 'purple'
})
const greenMaterial = new THREE.MeshStandardMaterial({
    ...regularMaterialConfig,
    color: 'green'
})

const materialList = [yellowMaterial, blueMaterial, purpleMaterial, greenMaterial]
const materialCount = materialList.length;
// create path effect
const pathVertices = []

let objectsToUpdate = []
let meshesToCheck = []

// create Spheres
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)

const hoverMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    color: '#ff0000',
    envMap: environmentMapTexture,
    userData: {id: 1}
})
const createSphere = (radius, position) => {
    //Three.js Mesh
    const mesh = new THREE.Mesh(
        sphereGeometry,
        getRandomMaterial(),
    )
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)

    scene.add(mesh)

    // Cannon.js Body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 0, 0),
        shape,
    })
    body.position.copy(position)
    
    body.addEventListener('collide', playHitSound)

    world.addBody(body)

    objectsToUpdate.push({
        mesh,
        body
    })
    meshesToCheck.push(mesh)
}

// create Boxes
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const createBox = (width, height, depth, position) => {
    // Three mesh
    const mesh = new THREE.Mesh(
        boxGeometry,
        getRandomMaterial()
    )
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    
    scene.add(mesh)

    // Cannon body
    const shape = new CANNON.Box(
        new CANNON.Vec3(
            width * 0.5,
            height * 0.5,
            depth * 0.5
        )
    )
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 0, 0),
        shape,
    })
    body.position.copy(position)

    body.addEventListener('collide', playHitSound)

    world.addBody(body)

    objectsToUpdate.push({
        mesh,
        body
    })
    meshesToCheck.push(mesh)
}

const removeObject = (object) => {
    const id = object.body.id;
    // remove body
    object.body.removeEventListener('collide', playHitSound)
    world.removeBody(object.body)
    //remove mesh
    scene.remove(object.mesh)
    objectsToUpdate = objectsToUpdate.filter(obj => {
        return obj.body.id != id
    })
    meshesToCheck = meshesToCheck.filter(mesh => {
        return mesh.id != object.mesh.id
    })
}

createSphere(0.5, {x: 0, y: 2.5, z: 0})

/*
    Apply Force
*/
let currentIntersect = null;

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime
    
    // Update Raycaster
    raycaster.setFromCamera(mouse, camera)

    const intersectedMeshes = raycaster.intersectObjects(meshesToCheck)
    for(const mesh of meshesToCheck) {
        if(mesh.material.userData.id === 1) {
            mesh.material = getRandomMaterial()
        }
    }
    if(intersectedMeshes.length) {
        intersectedMeshes[0].object.material = hoverMaterial
    }
    
    if(intersectedMeshes.length) {
        // mouse enters
        currentIntersect = intersectedMeshes[0]
    } else {
        // mouse leaves
        currentIntersect = null
    }

    // Update Physics World
    world.step(1/60, deltaTime, 3)
    
    for(const object of objectsToUpdate) {
        object.mesh.position.copy(
            object.body.position
        )
        object.mesh.quaternion.copy(
            object.body.quaternion
        )
        if(object.body.position.y <= -10) {
            removeObject(object)
        }
        limitBodySpeed(object.body, 10)
    }

    // Update controls
    controls.update()

    // Render
    composer.render(deltaTime)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

function limitBodySpeed(body, value) {
    // x
    if(body.velocity.x > 0) {
        body.velocity.x = Math.min(body.velocity.x, value)
    } else {
        body.velocity.x = Math.max(body.velocity.x, -1 * value)
    }
    // y
    if(body.velocity.y > 0) {
        body.velocity.y = Math.min(body.velocity.y, value)
    } else {
        body.velocity.y = Math.max(body.velocity.y, -1 * value)
    }
    // z
    if(body.velocity.z > 0) {
        body.velocity.z = Math.min(body.velocity.z, value)
    } else {
        body.velocity.z = Math.max(body.velocity.z, -1 * value)
    }
}
function getRandomMaterial() {
    return materialList[Math.floor(Math.random()*materialCount)]
}