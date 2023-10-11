import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default function createFloor(
    world, scene, environmentMapTexture, normalizedPosition, rotation
) {
    // rotation.axes
    // rotation value
    // Floor
    const size = 3
    const position = new CANNON.Vec3(
        size/2 * normalizedPosition.x, 
        size/2 * normalizedPosition.y, 
        size/2 * normalizedPosition.z
    )
    const floorShape = new CANNON.Box(
        new CANNON.Vec3(size/2, size/2, 0.01)
    ) // limited plane
    const floorBody = new CANNON.Body()
    floorBody.mass = 0 // it's static
    floorBody.addShape(floorShape)

    floorBody.quaternion.setFromAxisAngle(
        rotation.axes, rotation.value
    )
    floorBody.position.copy(position)

    world.addBody(floorBody)

    /**
     * Floor
     */
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
            color: 'white',
            wireframe: true,
            opacity: 0.1,
            transparent: true
        })
    )
    floor.position.copy(position)
    floor.receiveShadow = true
    applyRotation(floor, rotation)
    scene.add(floor)
}
function applyRotation(floor, rotation) {
    floor.rotation.x = rotation.axes.x * rotation.value
    floor.rotation.y = rotation.axes.y * rotation.value
    floor.rotation.z = rotation.axes.z * rotation.value
}
