import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const REGIONS = [
  { latMin: 38, latMax: 42, lonMin: 44, lonMax: 51, weight: 25, isAz: true },
  { latMin: 36, latMax: 42, lonMin: 26, lonMax: 45, weight: 8, isAz: false },
  { latMin: 47, latMax: 55, lonMin: 6, lonMax: 15, weight: 10, isAz: false },
  { latMin: 50, latMax: 56, lonMin: -4, lonMax: 2, weight: 8, isAz: false },
  { latMin: 25, latMax: 48, lonMin: -125, lonMax: -70, weight: 12, isAz: false },
  { latMin: 43, latMax: 55, lonMin: -80, lonMax: -60, weight: 5, isAz: false },
  { latMin: 43, latMax: 50, lonMin: -2, lonMax: 8, weight: 5, isAz: false },
  { latMin: 50, latMax: 54, lonMin: 3, lonMax: 7, weight: 4, isAz: false },
  { latMin: 22, latMax: 26, lonMin: 51, lonMax: 56, weight: 5, isAz: false },
  { latMin: 55, latMax: 60, lonMin: 30, lonMax: 50, weight: 5, isAz: false },
  { latMin: 35, latMax: 43, lonMin: 25, lonMax: 30, weight: 3, isAz: false },
  { latMin: 38, latMax: 45, lonMin: 12, lonMax: 19, weight: 3, isAz: false },
  { latMin: -35, latMax: -25, lonMin: 140, lonMax: 155, weight: 3, isAz: false },
  { latMin: 30, latMax: 38, lonMin: 125, lonMax: 132, weight: 3, isAz: false },
  { latMin: 1, latMax: 2, lonMin: 103, lonMax: 104, weight: 2, isAz: false },
];

function generateUserLocations(count) {
  const locations = [];
  const totalWeight = REGIONS.reduce((s, r) => s + r.weight, 0);
  for (let i = 0; i < count; i++) {
    let rand = Math.random() * totalWeight;
    for (const region of REGIONS) {
      rand -= region.weight;
      if (rand <= 0) {
        locations.push({
          lat: region.latMin + Math.random() * (region.latMax - region.latMin),
          lon: region.lonMin + Math.random() * (region.lonMax - region.lonMin),
          isAz: region.isAz,
        });
        break;
      }
    }
  }
  return locations;
}

export default function Globe() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.querySelector("canvas")) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // Globe sphere
    const globeGeo = new THREE.SphereGeometry(5, 64, 64);
    const globeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#1a3050"),
      transparent: true,
      opacity: 0.9,
    });
    scene.add(new THREE.Mesh(globeGeo, globeMat));

    // Wireframe overlay
    const wireGeo = new THREE.SphereGeometry(5.01, 36, 18);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x3a9ad9,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    scene.add(new THREE.Mesh(wireGeo, wireMat));

    // Atmospheric glow
    const glowGeo = new THREE.SphereGeometry(5.5, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.15, 0.5, 0.8, intensity * 0.6);
        }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // User location dots
    const userLocations = generateUserLocations(120);
    const dotPositions = [];
    const dotColors = [];
    const dotSizes = [];

    for (const loc of userLocations) {
      const phi = (90 - loc.lat) * (Math.PI / 180);
      const theta = (loc.lon + 180) * (Math.PI / 180);
      const r = 5.05;
      dotPositions.push(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      if (loc.isAz) {
        dotColors.push(1.0, 0.55, 0.2);
        dotSizes.push(0.35);
      } else {
        dotColors.push(0.4, 0.75, 1.0);
        dotSizes.push(0.18 + Math.random() * 0.1);
      }
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.Float32BufferAttribute(dotColors, 3));
    dotGeo.setAttribute("size", new THREE.Float32BufferAttribute(dotSizes, 1));

    // Bright dot layer (normal blending for visibility)
    const dotMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.15, 0.5, d);
          gl_FragColor = vec4(vColor, alpha);
        }`,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(dotGeo, dotMat));

    // Additive glow layer behind dots
    const glowDotMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (600.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * 0.4;
          gl_FragColor = vec4(vColor, alpha);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(dotGeo, glowDotMat));

    // Animation loop
    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Scroll-based scale animation
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function onScroll() {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
      const scale = 1.6 - 0.6 * easeOutCubic(progress);
      const opacity = 0.5 + 0.5 * easeOutCubic(progress);
      container.style.transform = `scale(${scale})`;
      container.style.opacity = opacity;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Resize handler
    function onResize() {
      if (!container.parentElement) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="mx-auto"
      style={{
        width: "min(560px, 90vw)",
        height: "min(560px, 90vw)",
        willChange: "transform, opacity",
      }}
    />
  );
}
