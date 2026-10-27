(function () {
  "use strict";

  const PALETTE = {
    navy: "#17364a",
    dark: "#07131f",
    cyan: "#32d7c4",
    orange: "#ff6b35",
    white: "#f5f2e9",
    steel: "#9fb1b9",
    blue: "#5aa9d6",
    violet: "#8f7ad8",
    yellow: "#e9bd43",
    red: "#c95838",
    green: "#5fb48f"
  };

  const hexToRgb = (hex) => {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  };

  const shade = (hex, amount) => {
    const { r, g, b } = hexToRgb(hex);
    const f = Math.max(.24, Math.min(1.25, amount));
    return `rgb(${Math.min(255, r * f)},${Math.min(255, g * f)},${Math.min(255, b * f)})`;
  };

  function rotatePoint(p, r) {
    let { x, y, z } = p;
    let c = Math.cos(r.x || 0), s = Math.sin(r.x || 0);
    [y, z] = [y * c - z * s, y * s + z * c];
    c = Math.cos(r.y || 0); s = Math.sin(r.y || 0);
    [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(r.z || 0); s = Math.sin(r.z || 0);
    [x, y] = [x * c - y * s, x * s + y * c];
    return { x, y, z };
  }

  function addFace(model, pts, color) { model.push({ pts, color }); }

  function transformPoint(p, center, rotation = {}) {
    const q = rotatePoint(p, rotation);
    return { x: q.x + center.x, y: q.y + center.y, z: q.z + center.z };
  }

  function addBox(model, center, size, color, rotation = {}) {
    const x = size.x / 2, y = size.y / 2, z = size.z / 2;
    const raw = [
      { x: -x, y: -y, z: -z }, { x, y: -y, z: -z }, { x, y, z: -z }, { x: -x, y, z: -z },
      { x: -x, y: -y, z }, { x, y: -y, z }, { x, y, z }, { x: -x, y, z }
    ].map(p => transformPoint(p, center, rotation));
    [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]].forEach(face => addFace(model, face.map(i => raw[i]), color));
  }

  function addWedge(model, center, size, color, rotation = {}) {
    const x = size.x / 2, y = size.y / 2, z = size.z / 2;
    const raw = [
      {x:-x,y:-y,z:-z},{x:x,y:-y,z:-z},{x:x*.55,y:y,z:-z},{x:-x*.55,y:y,z:-z},
      {x:-x,y:-y,z:z},{x:x,y:-y,z:z},{x:x*.55,y:y,z:z},{x:-x*.55,y:y,z:z}
    ].map(p => transformPoint(p, center, rotation));
    [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]].forEach(face => addFace(model, face.map(i => raw[i]), color));
  }

  function addCylinder(model, center, radius, height, segments, color, rotation = {}, coneTop = 1) {
    const lower = [], upper = [];
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2;
      lower.push(transformPoint({ x: Math.cos(a) * radius, y: -height / 2, z: Math.sin(a) * radius }, center, rotation));
      upper.push(transformPoint({ x: Math.cos(a) * radius * coneTop, y: height / 2, z: Math.sin(a) * radius * coneTop }, center, rotation));
    }
    for (let i = 0; i < segments; i++) {
      const n = (i + 1) % segments;
      addFace(model, [lower[i], lower[n], upper[n], upper[i]], color);
    }
    addFace(model, [...lower].reverse(), color);
    if (coneTop > 0) addFace(model, upper, color);
  }

  function addDisc(model, center, radius, thickness, color, rotation = {}) {
    addCylinder(model, center, radius, thickness, 12, color, rotation, 1);
  }

  function buildIha() {
    const m = [];
    addWedge(m,{x:0,y:0,z:0},{x:1.05,y:3.8,z:.72},PALETTE.white);
    addWedge(m,{x:0,y:.05,z:0},{x:5.2,y:1.05,z:.18},PALETTE.cyan);
    addWedge(m,{x:0,y:1.44,z:.03},{x:2.0,y:.62,z:.15},PALETTE.white);
    addWedge(m,{x:0,y:-2.05,z:0},{x:.72,y:.85,z:.6},PALETTE.orange);
    addBox(m,{x:0,y:.85,z:.47},{x:.36,y:.42,z:.25},PALETTE.dark);
    return m;
  }

  function buildDrone() {
    const m = [];
    addBox(m,{x:0,y:0,z:0},{x:1.4,y:1.1,z:.5},PALETTE.navy,{z:Math.PI/4});
    [Math.PI/4,-Math.PI/4].forEach(a => addBox(m,{x:0,y:0,z:0},{x:4.4,y:.18,z:.18},PALETTE.steel,{z:a}));
    [[-1.55,-1.55],[1.55,1.55],[-1.55,1.55],[1.55,-1.55]].forEach(([x,y],i)=>{
      addCylinder(m,{x,y,z:.06},.26,.28,10,PALETTE.orange,{x:Math.PI/2});
      addDisc(m,{x,y,z:.25},.88,.055,i%2?PALETTE.cyan:PALETTE.white,{x:Math.PI/2});
    });
    addBox(m,{x:0,y:-.55,z:.35},{x:.48,y:.35,z:.36},PALETTE.dark);
    return m;
  }

  function buildRocket() {
    const m = [];
    addCylinder(m,{x:0,y:0,z:0},.85,3.6,14,PALETTE.white);
    addCylinder(m,{x:0,y:2.45,z:0},.86,1.3,14,PALETTE.orange,{},0);
    addCylinder(m,{x:0,y:-2.0,z:0},.95,.55,14,PALETTE.navy);
    [-1,1].forEach(s=>{
      addWedge(m,{x:s*.95,y:-1.35,z:0},{x:.8,y:1.7,z:.22},PALETTE.orange,{z:s*.22});
      addWedge(m,{x:0,y:-1.35,z:s*.95},{x:.8,y:1.7,z:.22},PALETTE.orange,{y:Math.PI/2,z:s*.22});
    });
    addCylinder(m,{x:0,y:-2.5,z:0},.58,.5,12,PALETTE.dark,{},.72);
    return m;
  }

  function buildSatellite() {
    const m = [];
    addBox(m,{x:0,y:0,z:0},{x:1.35,y:1.65,z:1.25},PALETTE.white);
    [-1,1].forEach(s=>{
      addBox(m,{x:s*2.35,y:0,z:0},{x:3.1,y:1.25,z:.09},PALETTE.blue);
      for(let i=-1;i<=1;i++) addBox(m,{x:s*2.35+i*.95,y:0,z:.055},{x:.04,y:1.25,z:.02},PALETTE.white);
      addBox(m,{x:s*.95,y:0,z:0},{x:.55,y:.12,z:.12},PALETTE.steel);
    });
    addCylinder(m,{x:0,y:1.35,z:0},.2,1.1,10,PALETTE.steel);
    addDisc(m,{x:0,y:2.02,z:0},.65,.1,PALETTE.orange,{z:.18});
    addBox(m,{x:0,y:-1.1,z:0},{x:.18,y:.62,z:.18},PALETTE.orange);
    return m;
  }

  function buildHelicopter() {
    const m=[];
    addWedge(m,{x:-.7,y:0,z:0},{x:2.1,y:2.6,z:1.35},PALETTE.yellow,{z:-Math.PI/2});
    addWedge(m,{x:1.75,y:.1,z:.05},{x:.65,y:3.7,z:.52},PALETTE.navy,{z:-Math.PI/2});
    addBox(m,{x:3.35,y:.1,z:.25},{x:.18,y:1.1,z:1.35},PALETTE.orange);
    addDisc(m,{x:0,y:.1,z:.95},3.25,.08,PALETTE.white,{x:Math.PI/2});
    addCylinder(m,{x:0,y:.1,z:.6},.13,.7,8,PALETTE.dark);
    addDisc(m,{x:3.45,y:.1,z:.25},.9,.06,PALETTE.cyan,{y:Math.PI/2});
    addBox(m,{x:-.85,y:-.75,z:-.65},{x:.12,y:2.0,z:.12},PALETTE.steel,{z:Math.PI/2});
    return m;
  }

  function buildRobot() {
    const m=[];
    addBox(m,{x:0,y:1.95,z:0},{x:1.35,y:1.05,z:1.05},PALETTE.white);
    addBox(m,{x:0,y:.55,z:0},{x:1.9,y:1.65,z:.95},PALETTE.navy);
    addBox(m,{x:0,y:.65,z:.51},{x:.9,y:.52,z:.08},PALETTE.cyan);
    [-1,1].forEach(s=>{
      addCylinder(m,{x:s*1.28,y:.6,z:0},.25,1.6,8,PALETTE.white,{z:s*.12});
      addCylinder(m,{x:s*.58,y:-1.18,z:0},.32,1.9,8,PALETTE.steel,{z:s*.05});
      addBox(m,{x:s*.62,y:-2.25,z:.18},{x:.72,y:.42,z:1.15},PALETTE.dark);
      addDisc(m,{x:s*.31,y:2.0,z:.55},.11,.08,PALETTE.orange,{x:Math.PI/2});
    });
    addCylinder(m,{x:0,y:1.25,z:0},.28,.4,8,PALETTE.steel);
    return m;
  }

  function buildCar() {
    const m=[];
    addWedge(m,{x:0,y:0,z:0},{x:4.7,y:2.05,z:.72},PALETTE.blue,{z:Math.PI/2});
    addWedge(m,{x:0,y:.1,z:.64},{x:2.45,y:1.7,z:.85},PALETTE.white,{z:Math.PI/2});
    [[-1.48,-.86],[-1.48,.86],[1.48,-.86],[1.48,.86]].forEach(([x,y])=>{
      addCylinder(m,{x,y,z:-.45},.48,.3,12,PALETTE.dark,{x:Math.PI/2});
      addCylinder(m,{x,y,z:-.45},.21,.32,12,PALETTE.steel,{x:Math.PI/2});
    });
    addBox(m,{x:-2.32,y:0,z:.05},{x:.08,y:1.2,z:.24},PALETTE.orange);
    addBox(m,{x:2.32,y:0,z:.05},{x:.08,y:1.2,z:.24},PALETTE.cyan);
    return m;
  }

  function buildRover() {
    const m=[];
    addBox(m,{x:0,y:.25,z:0},{x:2.8,y:1.7,z:.65},PALETTE.white);
    addBox(m,{x:0,y:.55,z:.45},{x:2.3,y:1.25,z:.1},PALETTE.blue);
    [-1.45,0,1.45].forEach(x=>[-1,1].forEach(y=>{
      addCylinder(m,{x,y:y*.95,z:-.5},.46,.32,12,PALETTE.dark,{x:Math.PI/2});
      addBox(m,{x:x*.85,y:y*.75,z:-.28},{x:Math.abs(x)>.1?.85:.25,y:.12,z:.12},PALETTE.steel,{z:x*.08});
    }));
    addCylinder(m,{x:.45,y:.2,z:1.35},.13,1.5,8,PALETTE.steel);
    addBox(m,{x:.45,y:.2,z:2.12},{x:.9,y:.45,z:.5},PALETTE.navy);
    addBox(m,{x:.45,y:-.04,z:2.14},{x:.55,y:.05,z:.18},PALETTE.cyan);
    addCylinder(m,{x:-.75,y:.2,z:1.25},.12,1.35,8,PALETTE.orange,{z:-.38});
    return m;
  }

  const BUILDERS = { iha: buildIha, drone: buildDrone, rocket: buildRocket, satellite: buildSatellite, helicopter: buildHelicopter, robot: buildRobot, car: buildCar, rover: buildRover };

  class Tech3DRenderer {
    constructor(canvas, modelName, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.modelName = modelName;
      this.model = (BUILDERS[modelName] || BUILDERS.iha)();
      this.options = { autoRotate: true, interactive: true, transparent: false, scale: 1, ...options };
      this.rotation = { x: -.44, y: .48, z: .03 };
      this.zoom = this.options.scale;
      this.dragging = false;
      this.visible = true;
      this.last = null;
      this.frame = 0;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      if ("IntersectionObserver" in window) {
        this.intersectionObserver = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; });
        this.intersectionObserver.observe(canvas);
      }
      if (this.options.interactive) this.bindControls();
      this.resize();
      this.tick();
    }

    setModel(name) {
      this.modelName = name;
      this.model = (BUILDERS[name] || BUILDERS.iha)();
      this.rotation = { x: -.44, y: .48, z: .03 };
    }

    setZoom(value) { this.zoom = Math.max(.55, Math.min(2, value)); }

    bindControls() {
      this.canvas.addEventListener("pointerdown", e => {
        this.dragging = true; this.last = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture?.(e.pointerId);
      });
      this.canvas.addEventListener("pointermove", e => {
        if (!this.dragging) return;
        this.rotation.y += (e.clientX - this.last.x) * .012;
        this.rotation.x += (e.clientY - this.last.y) * .009;
        this.last = { x: e.clientX, y: e.clientY };
      });
      const stop = () => { this.dragging = false; this.last = null; };
      this.canvas.addEventListener("pointerup", stop);
      this.canvas.addEventListener("pointercancel", stop);
      this.canvas.addEventListener("wheel", e => {
        e.preventDefault();
        this.setZoom(this.zoom - e.deltaY * .0008);
      }, { passive: false });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w; this.canvas.height = h; this.dpr = dpr;
      }
    }

    project(point, width, height) {
      const distance = 8;
      const f = Math.min(width, height) * .23 * this.zoom;
      const perspective = f / Math.max(2, distance - point.z);
      return { x: width / 2 + point.x * perspective, y: height / 2 - point.y * perspective, z: point.z };
    }

    draw() {
      const ctx = this.ctx, width = this.canvas.width, height = this.canvas.height;
      ctx.clearRect(0, 0, width, height);
      if (!this.options.transparent) {
        const glow = ctx.createRadialGradient(width*.5,height*.47,0,width*.5,height*.47,Math.max(width,height)*.52);
        glow.addColorStop(0,"rgba(50,215,196,.11)"); glow.addColorStop(1,"rgba(7,19,31,0)");
        ctx.fillStyle = glow; ctx.fillRect(0,0,width,height);
      }
      const faces = this.model.map(face => {
        const world = face.pts.map(p => rotatePoint(p, this.rotation));
        const projected = world.map(p => this.project(p, width, height));
        const a = world[0], b = world[1], c = world[2];
        const ux=b.x-a.x, uy=b.y-a.y, uz=b.z-a.z, vx=c.x-a.x, vy=c.y-a.y, vz=c.z-a.z;
        const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
        const len=Math.hypot(nx,ny,nz)||1;
        const light=Math.max(0,(nx*.25 + ny*.75 + nz*.62)/len);
        return { projected, depth: world.reduce((s,p)=>s+p.z,0)/world.length, color: shade(face.color,.46+light*.72) };
      }).sort((a,b)=>a.depth-b.depth);

      ctx.lineJoin = "round";
      for (const face of faces) {
        ctx.beginPath();
        face.projected.forEach((p,i)=> i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
        ctx.closePath();
        ctx.fillStyle = face.color; ctx.fill();
        ctx.strokeStyle = "rgba(7,19,31,.22)"; ctx.lineWidth = Math.max(1,this.dpr||1); ctx.stroke();
      }
    }

    tick() {
      if (this.visible) {
        if (this.options.autoRotate && !this.dragging) this.rotation.y += .0032;
        this.draw();
      }
      this.frame = requestAnimationFrame(() => this.tick());
    }

    destroy() {
      cancelAnimationFrame(this.frame);
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
    }
  }

  window.Tech3DRenderer = Tech3DRenderer;
})();
