import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let globalSpeed = localStorage.getItem('cyber_speed') ? parseFloat(localStorage.getItem('cyber_speed')) : 0.002;
let globalAmplitude = localStorage.getItem('cyber_amplitude') ? parseFloat(localStorage.getItem('cyber_amplitude')) : 0.12;
const savedTheme = localStorage.getItem('cyber_theme') || '#00aaff';
const savedActive = localStorage.getItem('cyber_active') || '#00ffcc';
const savedInactive = localStorage.getItem('cyber_inactive') || '#ff3232';

document.body.style.color = savedTheme;
document.getElementById('speed-slider').value = globalSpeed;
document.getElementById('amplitude-slider').value = globalAmplitude;
document.getElementById('color-theme').value = savedTheme;
document.getElementById('color-active').value = savedActive;
document.getElementById('color-inactive').value = savedInactive;

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#030508', 0.0015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 25; 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// --- NOUVEAU : POUSSIÈRE D'ÉTOILES / DONNÉES EN FOND ---
const starsGeo = new THREE.BufferGeometry();
const starsPos = [];
for(let i=0; i<1000; i++) {
    starsPos.push((Math.random() - 0.5) * 150); 
    starsPos.push((Math.random() - 0.5) * 150); 
    starsPos.push((Math.random() - 0.5) * 150); 
}
starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
const starsMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.1, transparent: true, opacity: 0.3});
const starField = new THREE.Points(starsGeo, starsMat);
scene.add(starField);
// -------------------------------------------------------

function createWhiteHaloTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)'); 
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); 
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const haloTexture = createWhiteHaloTexture();

const activeColor = new THREE.Color(savedActive);
const inactiveColor = new THREE.Color(savedInactive);
const meColor = new THREE.Color('#ffffff');

const globeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(savedTheme), wireframe: true, transparent: true, opacity: 0.4 });
const activeSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: activeColor, blending: THREE.AdditiveBlending, depthWrite: false });
const inactiveSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: inactiveColor, blending: THREE.AdditiveBlending, depthWrite: false });
const meSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: meColor, blending: THREE.AdditiveBlending, depthWrite: false });
const activeLineMat = new THREE.LineBasicMaterial({ color: activeColor, transparent: true, opacity: 0.6 });
const inactiveLineMat = new THREE.LineBasicMaterial({ color: inactiveColor, transparent: true, opacity: 0.6 });

const solarSystem = {}; 
let currentPlanetId = 'main'; 

function createSystem(id, radius, isMain = false) {
    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    const posAttr = geometry.attributes.position;
    const originalPos = posAttr.array.slice();

    const globe = new THREE.Mesh(geometry, globeMaterial);
    const nodesGroup = new THREE.Group();
    globe.add(nodesGroup); 

    const pivot = new THREE.Group();
    pivot.add(globe);
    scene.add(pivot);

    if (!isMain) {
        const systemCount = Object.keys(solarSystem).length;
        const orbitRadius = 15 + (systemCount * 6); 
        const angle = systemCount * Math.PI / 3.5;
        globe.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
    }

    // NOUVEAU : Création des paquets de trafic réseau
    const packets = [];
    const packetMat = new THREE.SpriteMaterial({ map: haloTexture, color: activeColor, blending: THREE.AdditiveBlending, depthWrite: false });
    for(let i=0; i<4; i++) { // 4 points d'énergie par sphère
        const sprite = new THREE.Sprite(packetMat);
        sprite.scale.set(0.4, 0.4, 1);
        nodesGroup.add(sprite); // Ils sont collés à la sphère
        packets.push({ sprite: sprite, startIdx: 0, endIdx: 0, progress: 1 });
    }

    solarSystem[id] = { globe, nodesGroup, posAttr, originalPos, pivot, radius, deviceCount: 0, id: id, packets: packets };
    return solarSystem[id];
}

createSystem('main', 5, true);

const meSprite = new THREE.Sprite(meSpriteMat);
meSprite.scale.set(2, 2, 1);
meSprite.userData = { isMe: true, systemId: 'main', ip: 'Recherche IP...', host: 'Localhost', mac: 'Système', status: 'ONLINE', geo: '-', ports: '-' };
solarSystem['main'].nodesGroup.add(meSprite);

fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(data => { meSprite.userData.ip = `${data.ip} (Pub)`; meSprite.userData.geo = 'En Ligne'; })
    .catch(() => { meSprite.userData.ip = 'Local'; });

window.addPlanet = function(systemId) {
    if (!solarSystem[systemId]) {
        const sys = createSystem(systemId, 2.5, false);
        const netSprite = new THREE.Sprite(meSpriteMat);
        netSprite.scale.set(2, 2, 1);
        netSprite.userData = {
            isMe: true, systemId: systemId, ip: systemId, host: 'RÉSEAU LOCAL', mac: 'Infrastructure', status: 'SCAN EN COURS...', geo: '0 Appareil(s)', ports: '-'
        };
        sys.nodesGroup.add(netSprite);
        sys.netSprite = netSprite; 
    }
}

window.addNode = function(targetSystemId, ip, status = 'active', geo = 'Inconnue', ports = 'Aucun', host = 'Inconnu', mac = 'Inconnue') {
    const sys = solarSystem[targetSystemId] || solarSystem['main'];
    const sprite = new THREE.Sprite(status === 'active' ? activeSpriteMat : inactiveSpriteMat);
    sprite.scale.set(1.5, 1.5, 1); 
    sprite.userData = { isMe: false, systemId: targetSystemId, ip: ip, host: host, mac: mac, status: status, geo: geo, ports: ports };

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const surfacePos = new THREE.Vector3(sys.radius * Math.sin(phi) * Math.cos(theta), sys.radius * Math.sin(phi) * Math.sin(theta), sys.radius * Math.cos(phi));
    const outerPos = surfacePos.clone().multiplyScalar(1.15);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, outerPos]);
    const line = new THREE.Line(lineGeo, status === 'active' ? activeLineMat : inactiveLineMat);

    sprite.position.copy(outerPos);
    sys.nodesGroup.add(line);
    sys.nodesGroup.add(sprite);

    if (sys.netSprite) {
        sys.deviceCount++;
        sys.netSprite.userData.geo = `${sys.deviceCount} Appareil(s) trouvé(s)`;
        sys.netSprite.userData.status = 'EN LIGNE';
    }
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05;
controls.enablePan = false; controls.minDistance = 2; controls.maxDistance = 60;

let cameraTargetOrbit = null; 
let focusedNode = null;
let focusIndex = -1;

controls.addEventListener('start', () => {
    focusedNode = null;
    tooltip.style.display = 'none';
});

window.addEventListener('dblclick', () => {
    if (hoveredNode) {
        currentPlanetId = hoveredNode.userData.systemId;
        cameraTargetOrbit = solarSystem[currentPlanetId].globe;
    } else {
        cameraTargetOrbit = null;
        currentPlanetId = 'main';
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const sys = solarSystem[currentPlanetId];
        if (!sys) return;
        const halos = sys.nodesGroup.children.filter(c => c.type === 'Sprite');
        if (halos.length === 0) return;

        if (e.key === 'ArrowRight') focusIndex++;
        if (e.key === 'ArrowLeft') focusIndex--;
        
        if (focusIndex >= halos.length) focusIndex = 0;
        if (focusIndex < 0) focusIndex = halos.length - 1;

        focusedNode = halos[focusIndex];
        updateTooltipContent(focusedNode.userData);
    }
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-2, -2); 
const tooltip = document.getElementById('tooltip');
const tooltipHeader = document.getElementById('tooltip-header-text');
const tooltipIp = document.getElementById('tooltip-ip');
const tooltipHost = document.getElementById('tooltip-host');
const tooltipMac = document.getElementById('tooltip-mac'); 
const tooltipStatus = document.getElementById('tooltip-status');
const tooltipGeo = document.getElementById('tooltip-geo');
const tooltipPorts = document.getElementById('tooltip-ports');

let hoveredNode = null; 

function updateTooltipContent(data) {
    tooltipIp.innerText = data.ip; tooltipHost.innerText = data.host; 
    tooltipMac.innerText = data.mac || 'Inconnue'; 
    tooltipGeo.innerText = data.geo; tooltipPorts.innerText = data.ports;
    if (data.isMe) {
        tooltipHeader.innerText = data.host === 'RÉSEAU LOCAL' ? "INFRASTRUCTURE DÉTECTÉE" : "ACCÈS SYSTÈME SÉCURISÉ";
        tooltipStatus.innerText = data.status; tooltipStatus.style.color = "#ffffff"; tooltip.style.borderColor = "#ffffff";
    } else {
        tooltipHeader.innerText = "CIBLE DÉTECTÉE";
        tooltipStatus.innerText = data.status.toUpperCase();
        const statusColor = data.status === 'active' ? '#' + activeColor.getHexString() : '#' + inactiveColor.getHexString();
        tooltipStatus.style.color = statusColor; tooltip.style.borderColor = statusColor;
    }
    tooltip.style.display = 'block';
}

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('settings-btn').addEventListener('click', () => { const panel = document.getElementById('settings-panel'); panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; });
document.getElementById('speed-slider').addEventListener('input', (e) => { globalSpeed = parseFloat(e.target.value); localStorage.setItem('cyber_speed', globalSpeed); });
document.getElementById('amplitude-slider').addEventListener('input', (e) => { globalAmplitude = parseFloat(e.target.value); localStorage.setItem('cyber_amplitude', globalAmplitude); });
document.getElementById('color-theme').addEventListener('input', (e) => { globeMaterial.color.set(e.target.value); document.body.style.color = e.target.value; localStorage.setItem('cyber_theme', e.target.value); });
document.getElementById('color-active').addEventListener('input', (e) => { activeColor.set(e.target.value); localStorage.setItem('cyber_active', e.target.value); });
document.getElementById('color-inactive').addEventListener('input', (e) => { inactiveColor.set(e.target.value); localStorage.setItem('cyber_inactive', e.target.value); });

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Rotation douce des étoiles de fond
    starField.rotation.y += globalSpeed / 10;
    starField.rotation.x += globalSpeed / 20;

    Object.values(solarSystem).forEach(sys => {
        // Déformation
        for (let i = 0; i < sys.posAttr.count; i++) {
            const vx = sys.originalPos[i * 3];
            const vy = sys.originalPos[i * 3 + 1];
            const vz = sys.originalPos[i * 3 + 2];
            const wave = Math.sin(time * 2.5 + vx * 1.5 + vy * 1.5) * globalAmplitude;
            sys.posAttr.setXYZ(i, vx + wave, vy + wave, vz + wave);
        }
        sys.posAttr.needsUpdate = true;
        
        sys.globe.rotation.y += globalSpeed;
        sys.globe.rotation.x += globalSpeed / 4;
        
        if (sys.globe.position.x !== 0) { sys.pivot.rotation.y += globalSpeed / 5; }

        // NOUVEAU : Animation de l'énergie (Trafic) sur le réseau
        sys.packets.forEach(p => {
            if(p.progress >= 1) {
                p.progress = 0;
                p.startIdx = p.endIdx;
                p.endIdx = Math.floor(Math.random() * sys.posAttr.count); // Saute vers un nouveau noeud aléatoire
            }
            p.progress += 0.015; // Vitesse de déplacement du paquet
            
            // Calcul de la position actuelle entre les deux points de la sphère déformée
            const sx = sys.posAttr.getX(p.startIdx), sy = sys.posAttr.getY(p.startIdx), sz = sys.posAttr.getZ(p.startIdx);
            const ex = sys.posAttr.getX(p.endIdx), ey = sys.posAttr.getY(p.endIdx), ez = sys.posAttr.getZ(p.endIdx);
            
            p.sprite.position.set(
                sx + (ex - sx) * p.progress,
                sy + (ey - sy) * p.progress,
                sz + (ez - sz) * p.progress
            );
        });
    });

    if (focusedNode) {
        const targetPos = new THREE.Vector3();
        focusedNode.getWorldPosition(targetPos);
        controls.target.lerp(targetPos, 0.1); 
        
        const proj = targetPos.clone().project(camera);
        const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
        const y = (proj.y * -0.5 + 0.5) * window.innerHeight;
        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
        
    } else {
        raycaster.setFromCamera(mouse, camera);
        let allHalos = [];
        Object.values(solarSystem).forEach(sys => { allHalos = allHalos.concat(sys.nodesGroup.children.filter(child => child.type === 'Sprite')); });
        const intersects = raycaster.intersectObjects(allHalos);

        if (intersects.length > 0) {
            hoveredNode = intersects[0].object;
            updateTooltipContent(hoveredNode.userData);
            
            const event = window.event;
            if(event) {
                tooltip.style.left = event.clientX + 15 + 'px';
                tooltip.style.top = event.clientY + 15 + 'px';
            }
            document.body.style.cursor = 'crosshair';
        } else {
            hoveredNode = null;
            if (tooltip) tooltip.style.display = 'none';
            document.body.style.cursor = 'default';
        }

        if (cameraTargetOrbit) {
            const targetPos = new THREE.Vector3();
            cameraTargetOrbit.getWorldPosition(targetPos);
            controls.target.lerp(targetPos, 0.05); 
        } else {
            controls.target.lerp(new THREE.Vector3(0,0,0), 0.05); 
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();