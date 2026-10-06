(function () {
  const canvas = document.getElementById('construction-canvas');
  if (!canvas) return;

  const status = document.getElementById('construction-status');
  const vertexShader = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uViewProjection;
    uniform mat4 uModel;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {
      vec4 worldPosition = uModel * vec4(aPosition, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWorldNormal = normalize(mat3(uModel) * aNormal);
      gl_Position = uViewProjection * worldPosition;
    }
  `;
  const fragmentShader = `
    precision mediump float;
    uniform vec3 uColor;
    uniform float uMaterial;
    uniform float uTime;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    void main() {
      vec3 normal = normalize(vWorldNormal);
      vec3 lightDirection = normalize(vec3(-0.45, 0.82, 0.35));
      float light = 0.5 + max(dot(normal, lightDirection), 0.0) * 0.55;
      float grain = sin(vWorldPosition.x * 24.0 + sin(vWorldPosition.z * 9.0) * 2.1) * 0.045
        + sin(vWorldPosition.x * 7.0 + vWorldPosition.z * 2.0) * 0.025;
      float variation = 1.0;
      if (uMaterial > 0.5 && uMaterial < 1.5) variation += grain;
      if (uMaterial > 1.5 && uMaterial < 2.5) {
        variation += sin(vWorldPosition.x * 18.0 + vWorldPosition.y * 23.0) * 0.025;
      }
      if (uMaterial > 2.5) {
        float wave = sin(vWorldPosition.x * 2.1 + uTime * 1.3) * sin(vWorldPosition.z * 3.0 - uTime);
        variation += wave * 0.09;
        light += max(wave, 0.0) * 0.14;
      }
      gl_FragColor = vec4(uColor * variation * light, 1.0);
    }
  `;

  function makeShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`3D shader compilation failed: ${error}`);
    }
    return shader;
  }

  function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        for (let index = 0; index < 4; index += 1) {
          result[column * 4 + row] += a[index * 4 + row] * b[column * 4 + index];
        }
      }
    }
    return result;
  }

  function perspective(fieldOfView, aspect, near, far) {
    const scale = 1 / Math.tan(fieldOfView / 2);
    const range = 1 / (near - far);
    return new Float32Array([
      scale / aspect, 0, 0, 0,
      0, scale, 0, 0,
      0, 0, (near + far) * range, -1,
      0, 0, near * far * 2 * range, 0
    ]);
  }

  function lookAt(eye, target, up) {
    const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const normalize = vector => {
      const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
      return vector.map(value => value / length);
    };
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
    const zAxis = normalize(subtract(eye, target));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -xAxis[0] * eye[0] - xAxis[1] * eye[1] - xAxis[2] * eye[2],
      -yAxis[0] * eye[0] - yAxis[1] * eye[1] - yAxis[2] * eye[2],
      -zAxis[0] * eye[0] - zAxis[1] * eye[1] - zAxis[2] * eye[2],
      1
    ]);
  }

  function transform(position, size, rotationZ = 0, rotationX = 0) {
    const cosineZ = Math.cos(rotationZ);
    const sineZ = Math.sin(rotationZ);
    const cosineX = Math.cos(rotationX);
    const sineX = Math.sin(rotationX);
    const translation = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      position[0], position[1], position[2], 1
    ]);
    const rotateZ = new Float32Array([
      cosineZ, sineZ, 0, 0,
      -sineZ, cosineZ, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
    const rotateX = new Float32Array([
      1, 0, 0, 0,
      0, cosineX, sineX, 0,
      0, -sineX, cosineX, 0,
      0, 0, 0, 1
    ]);
    const scaling = new Float32Array([
      size[0], 0, 0, 0,
      0, size[1], 0, 0,
      0, 0, size[2], 0,
      0, 0, 0, 1
    ]);
    return multiplyMatrices(multiplyMatrices(multiplyMatrices(translation, rotateZ), rotateX), scaling);
  }

  function createCubeGeometry() {
    const faces = [
      { normal: [0, 0, 1], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
      { normal: [0, 0, -1], corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
      { normal: [1, 0, 0], corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
      { normal: [-1, 0, 0], corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
      { normal: [0, 1, 0], corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
      { normal: [0, -1, 0], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] }
    ];
    const vertices = [];
    faces.forEach(face => {
      [0, 1, 2, 0, 2, 3].forEach(index => vertices.push(...face.corners[index], ...face.normal));
    });
    return new Float32Array(vertices);
  }

  function createSphereGeometry() {
    const vertices = [];
    const slices = 14;
    const stacks = 10;
    for (let stack = 0; stack < stacks; stack += 1) {
      const top = Math.PI * stack / stacks;
      const bottom = Math.PI * (stack + 1) / stacks;
      for (let slice = 0; slice < slices; slice += 1) {
        const left = Math.PI * 2 * slice / slices;
        const right = Math.PI * 2 * (slice + 1) / slices;
        const point = (latitude, longitude) => {
          const normal = [
            Math.sin(latitude) * Math.cos(longitude),
            Math.cos(latitude),
            Math.sin(latitude) * Math.sin(longitude)
          ];
          return [...normal.map(value => value * 0.5), ...normal];
        };
        const a = point(top, left);
        const b = point(bottom, left);
        const c = point(bottom, right);
        const d = point(top, right);
        vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }
    return new Float32Array(vertices);
  }

  function colorVector(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
  }

  function initialize() {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) {
      status.hidden = false;
      status.textContent = 'العرض ثلاثي الأبعاد غير متاح على هذا الجهاز؛ جرّب Chrome أو Edge مع تفعيل تسريع الرسوم.';
      return;
    }

    try {
      const program = gl.createProgram();
      gl.attachShader(program, makeShader(gl, gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, makeShader(gl, gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`3D shader linking failed: ${gl.getProgramInfoLog(program)}`);
      }

      const locations = {
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal'),
        viewProjection: gl.getUniformLocation(program, 'uViewProjection'),
        model: gl.getUniformLocation(program, 'uModel'),
        color: gl.getUniformLocation(program, 'uColor'),
        material: gl.getUniformLocation(program, 'uMaterial'),
        time: gl.getUniformLocation(program, 'uTime')
      };
      const cubeBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, createCubeGeometry(), gl.STATIC_DRAW);
      const cubeVertexCount = 36;
      const sphereBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuffer);
      const sphereGeometry = createSphereGeometry();
      gl.bufferData(gl.ARRAY_BUFFER, sphereGeometry, gl.STATIC_DRAW);
      const sphereVertexCount = sphereGeometry.length / 6;
      gl.useProgram(program);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const scene = {
        pieces: [],
        riverHigh: false,
        building: false,
        truckStarted: null,
        truckArrived: false,
        ferryStarted: null,
        ferryArrived: false,
        installAnimations: new Map(),
        azimuth: 0.58,
        elevation: 0.62,
        pointer: null
      };

      function resize() {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * pixelRatio));
        const height = Math.max(1, Math.round(bounds.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
      }

      function draw(geometry, vertexCount, position, size, hexColor, material = 0, rotationZ = 0, rotationX = 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
        gl.enableVertexAttribArray(locations.position);
        gl.enableVertexAttribArray(locations.normal);
        gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 24, 12);
        gl.uniformMatrix4fv(locations.model, false, transform(position, size, rotationZ, rotationX));
        gl.uniform3fv(locations.color, colorVector(hexColor));
        gl.uniform1f(locations.material, material);
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
      }

      function box(position, size, color, material = 0, rotationZ = 0, rotationX = 0) {
        draw(cubeBuffer, cubeVertexCount, position, size, color, material, rotationZ, rotationX);
      }

      function sphere(position, size, color, material = 0) {
        draw(sphereBuffer, sphereVertexCount, position, size, color, material);
      }

      function pier(x, y = -0.1) {
        box([x, y - 0.43, 0], [0.62, 0.92, 0.72], '#9ba6a4', 2);
        box([x, y - 0.92, 0], [0.94, 0.14, 1.08], '#7d8987', 2);
        box([x, y + 0.02, 0], [0.9, 0.18, 1.02], '#b7bfba', 2);
        [-0.2, 0.2].forEach(offset => {
          box([x + offset, y - 0.4, 0.37], [0.035, 0.56, 0.025], '#5e7779');
        });
      }

      function drawFerry(x, y = -0.08, scale = 1) {
        sphere([x, y - 0.12, 0], [1.55 * scale, 0.42 * scale, 1.28 * scale], '#a94835');
        box([x, y + 0.1, 0], [1.18 * scale, 0.12 * scale, 1.02 * scale], '#d5b574', 1);
        box([x, y + 0.38 * scale, 0], [0.6 * scale, 0.5 * scale, 0.72 * scale], '#eed49a', 1);
        [-0.17, 0.17].forEach(offset => {
          box([x + offset, y + 0.43 * scale, 0.367 * scale], [0.14 * scale, 0.2 * scale, 0.025], '#83c5cf');
        });
        box([x, y + 0.66 * scale, 0], [0.82 * scale, 0.07 * scale, 0.94 * scale], '#ddd2b9');
        sphere([x - 0.46 * scale, y + 0.09, 0.47 * scale], [0.16 * scale, 0.16 * scale, 0.16 * scale], '#d94c3e');
      }

      function drawBridgePiece(shape, index, slotWidth, count, time) {
        const x = -3.95 + slotWidth * (index + 0.5);
        const installStarted = scene.installAnimations.get(index);
        const installProgress = installStarted === undefined ? 1 : Math.min(1, (time - installStarted) / 420);
        if (installProgress >= 1 && installStarted !== undefined) scene.installAnimations.delete(index);
        const offsetY = installStarted === undefined ? 0 : (1 - installProgress) * 0.9;
        const fadeScale = installStarted === undefined ? 1 : Math.max(0.05, installProgress);
        if (shape === 'ferry') {
          const firstFerry = scene.pieces.findIndex(piece => piece?.shape === 'ferry');
          if (index === firstFerry && scene.ferryStarted === null) {
            drawFerry(scene.ferryArrived ? 3.1 : -3.1, -0.06 + offsetY, 1.03 * fadeScale);
          }
          return;
        }

        if (shape === 'support') pier(x + offsetY * 0.15, -0.08 + offsetY);
        const ramp = shape === 'ramp';
        const plankColor = ramp ? '#a9733f' : '#ae7542';
        const angle = ramp ? 0.1 : 0;
        const boardCount = Math.max(2, Math.min(7, Math.round(slotWidth * 2)));
        const boardWidth = slotWidth * 0.95 / boardCount;
        for (let board = 0; board < boardCount; board += 1) {
          const boardX = x - slotWidth * 0.475 + boardWidth * (board + 0.5);
          const boardY = 0.36 + offsetY + (ramp ? (boardX - x) * 0.1 : 0);
          box([boardX, boardY, 0], [boardWidth * 0.94 * fadeScale, 0.15 * fadeScale, 1.52 * fadeScale], plankColor, 1, angle);
          box([boardX, boardY - 0.1 * fadeScale, 0.77 * fadeScale], [boardWidth * 0.94 * fadeScale, 0.11 * fadeScale, 0.08 * fadeScale], '#75502f', 1, angle);
          box([boardX, boardY - 0.1 * fadeScale, -0.77 * fadeScale], [boardWidth * 0.94 * fadeScale, 0.11 * fadeScale, 0.08 * fadeScale], '#75502f', 1, angle);
        }
        box([x, 0.25 + offsetY, 0.68], [slotWidth * 0.95 * fadeScale, 0.13 * fadeScale, 0.1 * fadeScale], '#62432d', 1, angle);
        box([x, 0.25 + offsetY, -0.68], [slotWidth * 0.95 * fadeScale, 0.13 * fadeScale, 0.1 * fadeScale], '#62432d', 1, angle);
        [-0.69, 0.69].forEach(z => {
          [-0.44, 0.44].forEach(position => {
            box([x + slotWidth * position, 0.53 + offsetY, z], [0.09, 0.46 * fadeScale, 0.09], '#596a6a');
          });
          box([x, 0.72 + offsetY, z], [slotWidth * 0.92 * fadeScale, 0.075 * fadeScale, 0.075], '#667775');
        });
      }

      function drawTruck(x, y = 0.77) {
        box([x, y, 0], [1.08, 0.43, 0.58], '#e5a447');
        box([x + 0.28, y + 0.25, 0], [0.48, 0.38, 0.54], '#f0bb59');
        box([x + 0.3, y + 0.29, 0.278], [0.25, 0.19, 0.025], '#8dc5ce');
        box([x + 0.3, y + 0.29, -0.278], [0.25, 0.19, 0.025], '#8dc5ce');
        [-0.31, 0.34].forEach(offset => {
          sphere([x + offset, y - 0.25, 0.28], [0.26, 0.26, 0.15], '#354044');
          sphere([x + offset, y - 0.25, -0.28], [0.26, 0.26, 0.15], '#354044');
        });
      }

      function drawWorker(time) {
        const x = -4.65;
        const bob = scene.building ? Math.sin(time * 0.014) * 0.045 : 0;
        box([x, -0.04 + bob, 0.66], [0.42, 0.62, 0.32], '#315e68');
        box([x, 0.02 + bob, 0.84], [0.32, 0.38, 0.1], '#e3a342');
        box([x - 0.12, -0.42, 0.66], [0.13, 0.36, 0.15], '#354448');
        box([x + 0.12, -0.42, 0.66], [0.13, 0.36, 0.15], '#354448');
        sphere([x, 0.48 + bob, 0.66], [0.39, 0.43, 0.36], '#d49a74');
        sphere([x, 0.71 + bob, 0.66], [0.5, 0.17, 0.45], '#edb947');
        box([x, 0.65 + bob, 0.86], [0.67, 0.07, 0.07], '#b57b31');
        const armAngle = scene.building ? Math.sin(time * 0.014) * 0.45 : -0.18;
        box([x + 0.27, 0.04 + bob, 0.66], [0.13, 0.52, 0.13], '#d49a74', 0, armAngle);
        box([x - 0.27, 0.04 + bob, 0.66], [0.13, 0.52, 0.13], '#d49a74', 0, -armAngle);
      }

      function drawEnvironment(time) {
        box([0, -1.25, 0], [80, 0.3, 50], '#73905e');
        box([-9.4, -0.91, 0], [11, 0.48, 15], '#8da96c');
        box([9.4, -0.91, 0], [11, 0.48, 15], '#879f67');
        box([0, -0.62, 0], [8.7, 0.08, 6], scene.riverHigh ? '#357f94' : '#4c9aab', 3);
        box([-4.35, -0.47, 0], [0.32, 0.24, 6.1], '#ae9d78', 2);
        box([4.35, -0.47, 0], [0.32, 0.24, 6.1], '#b8a47b', 2);
        for (let index = 0; index < 9; index += 1) {
          const z = (index - 4) * 0.54;
          const x = Math.sin(index * 2.4) * 0.22;
          box([x, -0.56 + Math.sin(time * 0.001 + index) * 0.012, z], [0.8 + index % 3 * 0.35, 0.018, 0.035], '#bfe8e7', 3);
        }
        [-4.8, 4.8].forEach((x, side) => {
          for (let index = 0; index < 4; index += 1) {
            const z = (index - 1.5) * 1.1;
            sphere([x + Math.sin(index * 2) * 0.22, -0.4, z], [0.38, 0.26, 0.43], side ? '#9c9a82' : '#aaa183', 2);
          }
        });
        [-8, -6.7, 6.8, 8.2].forEach((x, index) => {
          const z = index % 2 ? -3.3 : 3.4;
          box([x, -0.05, z], [0.22, 1.3, 0.22], '#72563c');
          sphere([x, 0.83, z], [1.35, 1.6, 1.3], index % 2 ? '#5f8056' : '#6d8958');
        });
        [-3.5, 3.5].forEach(x => {
          box([x, -0.51, 0], [1.25, 0.12, 1.72], '#604832');
        });
      }

      function drawHouse() {
        const x = 5.25;
        box([x, 0.12, 0], [1.32, 1.28, 1.38], '#e9d29e');
        box([x - 0.02, 0.75, 0.34], [1.54, 0.18, 1], '#8e493b', 0, 0, -0.48);
        box([x + 0.02, 0.75, -0.34], [1.54, 0.18, 1], '#a8543e', 0, 0, 0.48);
        box([x - 0.68, 0.15, 0.72], [0.3, 0.38, 0.07], '#80bdc7');
        box([x + 0.2, 0.15, 0.72], [0.3, 0.38, 0.07], '#80bdc7');
        box([x + 0.58, -0.04, 0.72], [0.26, 0.86, 0.09], '#8b6143');
      }

      function render(time) {
        resize();
        const aspect = canvas.width / canvas.height;
        const radius = 15.5;
        const eye = [
          Math.sin(scene.azimuth) * radius,
          4.8 + scene.elevation * 5.4,
          Math.cos(scene.azimuth) * radius
        ];
        const viewProjection = multiplyMatrices(
          perspective(Math.PI / 4.1, aspect, 0.1, 100),
          lookAt(eye, [0, 0, 0], [0, 1, 0])
        );
        gl.clearColor(0.66, 0.85, 0.9, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(locations.viewProjection, false, viewProjection);
        gl.uniform1f(locations.time, time * 0.001);
        drawEnvironment(time);
        drawHouse();
        drawWorker(time);

        const slotCount = Math.max(1, scene.pieces.length);
        const slotWidth = 7.9 / slotCount;
        scene.pieces.forEach((piece, index) => {
          if (piece && piece.shape) drawBridgePiece(piece.shape, index, slotWidth, slotCount, time);
        });

        const hasFerry = scene.pieces.some(piece => piece?.shape === 'ferry');
        const crossingStarted = hasFerry ? scene.ferryStarted : scene.truckStarted;
        if (crossingStarted !== null) {
          const progress = Math.min(1, (time - crossingStarted) / 1700);
          const x = -4.2 + progress * 8.4;
          if (hasFerry) drawFerry(x, -0.02, 1.05);
          else drawTruck(x, 0.78);
          if (progress >= 1) {
            if (hasFerry) {
              scene.ferryStarted = null;
              scene.ferryArrived = true;
            } else {
              scene.truckStarted = null;
              scene.truckArrived = true;
            }
          }
        } else if (!hasFerry) {
          drawTruck(scene.truckArrived ? 4.1 : -4.1, 0.78);
        }

        window.requestAnimationFrame(render);
      }

      canvas.addEventListener('pointerdown', event => {
        scene.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', event => {
        if (!scene.pointer || scene.pointer.id !== event.pointerId) return;
        const deltaX = event.clientX - scene.pointer.x;
        const deltaY = event.clientY - scene.pointer.y;
        scene.azimuth += deltaX * 0.008;
        scene.elevation = Math.max(0.18, Math.min(1.3, scene.elevation - deltaY * 0.006));
        scene.pointer.x = event.clientX;
        scene.pointer.y = event.clientY;
      });
      const endDrag = event => {
        if (scene.pointer?.id === event.pointerId) scene.pointer = null;
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);

      canvas.closest('.city-scene').classList.add('webgl-ready');
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        status.hidden = false;
        status.textContent = 'توقف العرض ثلاثي الأبعاد. أعد تحميل الصفحة لاستعادة المشهد.';
      });
      status.hidden = false;
      status.textContent = 'مشهد ثلاثي الأبعاد — اسحب لتغيير زاوية الرؤية.';

      window.BridgeBuilder3D = {
        setPlan(pieces, riverHigh) {
          scene.pieces = pieces.map(piece => piece.empty ? null : { shape: piece.shape });
          scene.riverHigh = riverHigh;
        },
        setBuilding(value) {
          scene.building = value;
        },
        installPiece(index) {
          scene.installAnimations.set(index, performance.now());
        },
        animateCrossing() {
          const hasFerry = scene.pieces.some(piece => piece?.shape === 'ferry');
          if (hasFerry) scene.ferryStarted = performance.now();
          else scene.truckStarted = performance.now();
        },
        resetCrossing() {
          scene.truckStarted = null;
          scene.truckArrived = false;
          scene.ferryStarted = null;
          scene.ferryArrived = false;
          scene.installAnimations.clear();
        }
      };
      window.requestAnimationFrame(render);
    } catch (error) {
      console.error('Unable to initialize the 3D bridge scene:', error);
      status.hidden = false;
      status.textContent = 'تعذّر تشغيل المشهد ثلاثي الأبعاد. أعد تحميل الصفحة أو استخدم متصفحًا أحدث.';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const cloud = await window.KidsGamesCloudReady;
    if (cloud?.enabled) initialize();
  }, { once: true });
}());
