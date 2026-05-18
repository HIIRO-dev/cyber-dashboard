import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let globalSpeed = localStorage.getItem('cyber_speed') ? parseFloat(localStorage.getItem('cyber_speed')) : 0.002;
let globalAmplitude = localStorage.getItem('cyber_amplitude') ? parseFloat(localStorage.getItem('cyber_amplitude')) : 0.12;

const savedTheme = localStorage.getItem('cyber_theme') || '#00aaff';
const savedDefense = localStorage.getItem('cyber_defense') || '#ff00ff';
const savedActive = localStorage.getItem('cyber_active') || '#00ffcc';
const savedInactive = localStorage.getItem('cyber_inactive') || '#ff3232';

document.body.style.color = savedTheme;
document.getElementById('speed-slider').value = globalSpeed;
document.getElementById('amplitude-slider').value = globalAmplitude;
document.getElementById('color-theme').value = savedTheme;
document.getElementById('color-defense').value = savedDefense; 
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

const starsGeo = new THREE.BufferGeometry();
const starsPos = [];
for(let i=0; i<1500; i++) {
    starsPos.push((Math.random() - 0.5) * 200); 
    starsPos.push((Math.random() - 0.5) * 200); 
    starsPos.push((Math.random() - 0.5) * 200); 
}
starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
const starsMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.08, transparent: true, opacity: 0.3});
const starField = new THREE.Points(starsGeo, starsMat);
scene.add(starField);

const atomsGroup = new THREE.Group();
scene.add(atomsGroup);
const electronGeo = new THREE.SphereGeometry(0.04, 8, 8);
const electronMat = new THREE.MeshBasicMaterial({color: 0xffffff});

const atomCoresMat = [];
const atomOrbitsMat = [];

for(let i=0; i<12; i++) {
    const atom = new THREE.Group();
    const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({color: savedTheme, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending});
    const core = new THREE.Mesh(coreGeo, coreMat);
    atom.add(core);
    atomCoresMat.push(coreMat);

    const electrons = [];
    for(let j=0; j<3; j++) {
        const orbitRadius = 0.4 + (j * 0.15);
        const orbitGeo = new THREE.RingGeometry(orbitRadius, orbitRadius + 0.01, 32);
        const orbitMat = new THREE.MeshBasicMaterial({color: savedTheme, transparent: true, opacity: 0.2, side: THREE.DoubleSide});
        const orbit = new THREE.Mesh(orbitGeo, orbitMat);
        orbit.rotation.x = Math.random() * Math.PI;
        orbit.rotation.y = Math.random() * Math.PI;
        atom.add(orbit);
        atomOrbitsMat.push(orbitMat);

        const e = new THREE.Mesh(electronGeo, electronMat);
        orbit.add(e);
        electrons.push({mesh: e, orbitRadius: orbitRadius, angle: Math.random()*Math.PI*2, speed: 0.02 + Math.random()*0.03});
    }
    
    atom.position.set((Math.random()-0.5)*80, (Math.random()-0.5)*80, (Math.random()-0.5)*50 - 15);
    atom.userData = {electrons: electrons, orbitSpeed: 0.001 + Math.random()*0.003};
    atomsGroup.add(atom);
}

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
const defenseColor = new THREE.Color(savedDefense); 
const meColor = new THREE.Color('#ffffff');

const globeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(savedTheme), wireframe: true, transparent: true, opacity: 0.3 });
const defenseGlobeMat = new THREE.MeshBasicMaterial({ color: defenseColor, wireframe: true, transparent: true, opacity: 0.3 });
const defenseSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: defenseColor, blending: THREE.AdditiveBlending, depthWrite: false });
const defenseLineMat = new THREE.LineBasicMaterial({ color: defenseColor, transparent: true, opacity: 0.4 });

const activeSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: activeColor, blending: THREE.AdditiveBlending, depthWrite: false });
const inactiveSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: inactiveColor, blending: THREE.AdditiveBlending, depthWrite: false });
const meSpriteMat = new THREE.SpriteMaterial({ map: haloTexture, color: meColor, blending: THREE.AdditiveBlending, depthWrite: false });
const activeLineMat = new THREE.LineBasicMaterial({ color: activeColor, transparent: true, opacity: 0.4 });
const inactiveLineMat = new THREE.LineBasicMaterial({ color: inactiveColor, transparent: true, opacity: 0.4 });

const solarSystem = {}; 
let currentPlanetId = 'main'; 

function createSystem(id, radius, isMain = false, type = 'normal') {
    const geometry = new THREE.IcosahedronGeometry(radius, 2);
    const posAttr = geometry.attributes.position;
    const originalPos = posAttr.array.slice();

    const mat = (type === 'defense') ? defenseGlobeMat : globeMaterial;
    const globe = new THREE.Mesh(geometry, mat);
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

    solarSystem[id] = { globe, nodesGroup, posAttr, originalPos, pivot, radius, deviceCount: 0, id: id, type: type, signals: [] };
    return solarSystem[id];
}

createSystem('main', 5, true);

// --- NOUVEAU : GESTION DES IP LOCALE ET PUBLIQUE ---
const myLocalIp = window.myLocalIp || '127.0.0.1';
const meSprite = new THREE.Sprite(meSpriteMat);
meSprite.scale.set(2, 2, 1);
meSprite.userData = { 
    isMe: true, 
    type: 'host', 
    systemId: 'main', 
    ip: `${myLocalIp} (Locale)`, 
    host: 'Machine Locale (Kali)', 
    mac: 'Système', 
    status: 'ONLINE', 
    geo: '-', 
    ports: '-' 
};
solarSystem['main'].nodesGroup.add(meSprite);

fetch('https://api4.ipify.org?format=json')
    .then(r => r.json())
    .then(data => { 
        // Affiche l'IP locale, et l'IP Publique en dessous
        meSprite.userData.ip = `${myLocalIp} (LAN)\n\n          ${data.ip} (Publique)`; 
        meSprite.userData.geo = 'Routé / En Ligne'; 
    })
    .catch(() => { 
        meSprite.userData.ip = `${myLocalIp} (Locale)`; 
    });
// ---------------------------------------------------

window.addPlanet = function(systemId, type = 'normal') {
    if (!solarSystem[systemId]) {
        const sys = createSystem(systemId, 2.5, false, type);
        const netSprite = new THREE.Sprite(meSpriteMat);
        netSprite.scale.set(2, 2, 1);
        netSprite.userData = {
            isMe: true, type: 'host', systemId: systemId, ip: systemId, host: type === 'defense' ? 'BOUCLIER ACTIF' : 'RÉSEAU LOCAL', mac: 'Infrastructure', status: 'MONITORING...', geo: '0 Alerte(s)', ports: '-'
        };
        sys.nodesGroup.add(netSprite);
        sys.netSprite = netSprite; 
    }
}

window.addNode = function(targetSystemId, ip, status = 'active', geo = 'Inconnue', ports = 'Aucun', host = 'Inconnu', mac = 'Inconnue') {
    const sys = solarSystem[targetSystemId] || solarSystem['main'];
    
    let sMat = status === 'active' ? activeSpriteMat : inactiveSpriteMat;
    let lMat = status === 'active' ? activeLineMat : inactiveLineMat;
    
    if (sys.type === 'defense' && status === 'active') {
        sMat = defenseSpriteMat;
        lMat = defenseLineMat;
    }

    const sprite = new THREE.Sprite(sMat);
    sprite.scale.set(1.5, 1.5, 1); 
    sprite.userData = { isMe: false, type: 'host', systemId: targetSystemId, ip: ip, host: host, mac: mac, status: status, geo: geo, ports: ports };

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const surfacePos = new THREE.Vector3(sys.radius * Math.sin(phi) * Math.cos(theta), sys.radius * Math.sin(phi) * Math.sin(theta), sys.radius * Math.cos(phi));
    const outerPos = surfacePos.clone().multiplyScalar(1.15);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, outerPos]);
    const line = new THREE.Line(lineGeo, lMat);

    sprite.position.copy(outerPos);
    sys.nodesGroup.add(line);
    sys.nodesGroup.add(sprite);

    if (sys.netSprite) {
        sys.deviceCount++;
        sys.netSprite.userData.geo = `${sys.deviceCount} Entrée(s) détéctée(s)`;
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
        const hosts = sys.nodesGroup.children.filter(c => c.userData && c.userData.type === 'host');
        if (hosts.length === 0) return;

        if (e.key === 'ArrowRight') focusIndex++;
        if (e.key === 'ArrowLeft') focusIndex--;
        
        if (focusIndex >= hosts.length) focusIndex = 0;
        if (focusIndex < 0) focusIndex = hosts.length - 1;

        focusedNode = hosts[focusIndex];
        updateTooltipContent(focusedNode.userData);
    }
    
    if (e.key.toLowerCase() === 'b') {
        const targetNode = focusedNode || hoveredNode;
        if (targetNode && !targetNode.userData.isMe) {
            if (window.blockIp) window.blockIp(targetNode.userData.ip);
            targetNode.userData.status = 'BLOQUÉ (DROP)';
            targetNode.material = inactiveSpriteMat; 
            updateTooltipContent(targetNode.userData);
        }
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
const tooltipBlockHint = document.getElementById('tooltip-block-hint');

let hoveredNode = null; 

function updateTooltipContent(data) {
    tooltipIp.innerText = data.ip; tooltipHost.innerText = data.host; 
    tooltipMac.innerText = data.mac || 'Inconnue'; 
    tooltipGeo.innerText = data.geo; tooltipPorts.innerText = data.ports;
    
    if (data.isMe) {
        tooltipHeader.innerText = data.host === 'BOUCLIER ACTIF' ? "SYSTÈME DE DÉFENSE" : (data.host === 'RÉSEAU LOCAL' ? "INFRASTRUCTURE DÉTECTÉE" : "ACCÈS SYSTÈME SÉCURISÉ");
        tooltipStatus.innerText = data.status; tooltipStatus.style.color = "#ffffff"; tooltip.style.borderColor = "#ffffff";
        tooltipBlockHint.innerText = ""; 
    } else {
        tooltipHeader.innerText = "CIBLE DÉTECTÉE";
        tooltipStatus.innerText = data.status.toUpperCase();
        const statusColor = data.status.includes('BLOQUÉ') ? '#' + inactiveColor.getHexString() : (data.systemId === 'defense' ? '#' + defenseColor.getHexString() : '#' + activeColor.getHexString());
        tooltipStatus.style.color = statusColor; tooltip.style.borderColor = statusColor;
        tooltipBlockHint.innerText = data.status.includes('BLOQUÉ') ? "" : "[ B ] POUR BLOQUER L'IP";
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
document.getElementById('color-theme').addEventListener('input', (e) => { 
    globeMaterial.color.set(e.target.value); 
    atomCoresMat.forEach(m => m.color.set(e.target.value));
    atomOrbitsMat.forEach(m => m.color.set(e.target.value));
    activeSpriteMat.color.set(e.target.value); 
    document.body.style.color = e.target.value; 
    localStorage.setItem('cyber_theme', e.target.value); 
});
document.getElementById('color-defense').addEventListener('input', (e) => { 
    defenseColor.set(e.target.value); 
    defenseGlobeMat.color.set(e.target.value);
    defenseSpriteMat.color.set(e.target.value);
    defenseLineMat.color.set(e.target.value);
    localStorage.setItem('cyber_defense', e.target.value); 
});
document.getElementById('color-active').addEventListener('input', (e) => { activeColor.set(e.target.value); localStorage.setItem('cyber_active', e.target.value); });
document.getElementById('color-inactive').addEventListener('input', (e) => { inactiveColor.set(e.target.value); localStorage.setItem('cyber_inactive', e.target.value); });

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    starField.rotation.y += globalSpeed / 10;
    starField.rotation.x += globalSpeed / 20;

    Object.values(atomsGroup.children).forEach(a => {
        a.rotation.y += a.userData.orbitSpeed;
        a.rotation.x += a.userData.orbitSpeed / 2;
        a.position.y += Math.sin(time + a.position.x)*0.01;
        a.userData.electrons.forEach(e => {
            e.angle += e.speed;
            e.mesh.position.set(Math.cos(e.angle)*e.orbitRadius, Math.sin(e.angle)*e.orbitRadius, 0);
        });
    });

    Object.values(solarSystem).forEach(sys => {
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

        const hosts = sys.nodesGroup.children.filter(c => c.userData && c.userData.type === 'host' && !c.userData.isMe);
        
        if (hosts.length > 0 && Math.random() < 0.05) {
            const target = hosts[Math.floor(Math.random() * hosts.length)];
            const sigMat = sys.type === 'defense' ? defenseSpriteMat : activeSpriteMat;
            const signal = new THREE.Sprite(sigMat);
            signal.scale.set(0.6, 0.6, 1);
            signal.position.set(0,0,0); 
            sys.nodesGroup.add(signal);
            sys.signals.push({ sprite: signal, targetPos: target.position.clone(), progress: 0 });
        }

        for (let i = sys.signals.length - 1; i >= 0; i--) {
            const sig = sys.signals[i];
            sig.progress += 0.02 + (globalSpeed * 5); 
            sig.sprite.position.copy(new THREE.Vector3(0,0,0).lerp(sig.targetPos, sig.progress));
            if (sig.progress > 0.8) sig.sprite.material.opacity = (1 - sig.progress) * 5;
            if (sig.progress >= 1) {
                sys.nodesGroup.remove(sig.sprite);
                sys.signals.splice(i, 1);
            }
        }
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
        Object.values(solarSystem).forEach(sys => { allHalos = allHalos.concat(sys.nodesGroup.children.filter(child => child.userData && child.userData.type === 'host')); });
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