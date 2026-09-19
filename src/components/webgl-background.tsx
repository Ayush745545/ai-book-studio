"use client";

import { useEffect, useRef } from "react";

export function WebGLBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform vec2 u_resolution;

      #define PI 3.14159265359

      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }

      float dither(vec2 uv) {
        vec2 px = floor(mod(uv * u_resolution, 4.0));
        int x = int(px.x);
        int y = int(px.y);
        float d = 0.0;
        if (y == 0) {
          if (x == 0) d = 0.0;
          else if (x == 1) d = 0.5;
          else if (x == 2) d = 0.125;
          else d = 0.625;
        } else if (y == 1) {
          if (x == 0) d = 0.75;
          else if (x == 1) d = 0.25;
          else if (x == 2) d = 0.875;
          else d = 0.375;
        } else if (y == 2) {
          if (x == 0) d = 0.1875;
          else if (x == 1) d = 0.6875;
          else if (x == 2) d = 0.0625;
          else d = 0.5625;
        } else {
          if (x == 0) d = 0.9375;
          else if (x == 1) d = 0.4375;
          else if (x == 2) d = 0.8125;
          else d = 0.3125;
        }
        return (d - 0.5) / 255.0;
      }

      void main() {
        vec2 uv = v_uv;
        float aspect = u_resolution.x / u_resolution.y;
        uv.x *= aspect;

        vec3 col = vec3(0.035, 0.032, 0.045);

        float t = u_time * 0.08;

        vec2 p1 = uv * 1.6 - vec2(0.8);
        p1 += vec2(sin(t * 0.9) * 0.25, cos(t * 0.7) * 0.18);
        float n1 = fbm(p1 + t * 0.3);
        float blob1 = smoothstep(0.35, 0.72, n1);
        col += vec3(0.16, 0.12, 0.28) * blob1 * 0.22;

        vec2 p2 = uv * 1.4 - vec2(0.7);
        p2 += vec2(sin(t * 0.6 + 1.5) * 0.2, cos(t * 0.5 + 1.0) * 0.28);
        float n2 = fbm(p2 * 1.3 - t * 0.25);
        float blob2 = smoothstep(0.32, 0.68, n2);
        col += vec3(0.18, 0.09, 0.30) * blob2 * 0.18;

        vec2 p3 = uv * 2.0 - vec2(1.0);
        p3 += vec2(sin(t * 0.4 + 2.2) * 0.15, cos(t * 0.55 + 0.5) * 0.22);
        float n3 = fbm(p3 * 0.9 + t * 0.2);
        float blob3 = smoothstep(0.45, 0.78, n3);
        col += vec3(0.22, 0.08, 0.22) * blob3 * 0.12;

        float vignetteCenter = length(uv - vec2(0.5 * aspect, 0.5));
        float vig = 1.0 - smoothstep(0.3, 1.1, vignetteCenter);
        col *= mix(0.75, 1.05, vig);

        col += dither(v_uv);

        col = clamp(col, 0.0, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return null;
      }
      return program;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1, 1,   1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    const gl2 = gl as WebGLRenderingContext;

    const MAX_DPR = 1.5;
    let cw = 0, ch = 0;

    function resize() {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.floor(c.clientWidth * dpr));
      const h = Math.max(1, Math.floor(c.clientHeight * dpr));
      if (w !== cw || h !== ch) {
        cw = w;
        ch = h;
        c.width = w;
        c.height = h;
        gl2.viewport(0, 0, w, h);
      }
    }

    const startTime = performance.now();
    let animationId: number;
    let lastResizeCheck = 0;
    const RESIZE_INTERVAL = 500;

    function render(now: number) {
      const c = canvasRef.current;
      if (!c) return;
      const time = (now - startTime) * 0.001;

      if (now - lastResizeCheck > RESIZE_INTERVAL) {
        resize();
        lastResizeCheck = now;
      }

      gl2.clearColor(0.035, 0.032, 0.045, 1.0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);

      gl2.useProgram(program);
      gl2.enableVertexAttribArray(positionLocation);
      gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer);
      gl2.vertexAttribPointer(positionLocation, 2, gl2.FLOAT, false, 0, 0);

      gl2.uniform1f(timeLocation, time);
      gl2.uniform2f(resolutionLocation, cw, ch);

      gl2.drawArrays(gl2.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(render);
    }

    resize();
    animationId = requestAnimationFrame(render);

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        resize();
        lastResizeCheck = performance.now();
        animationId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      gl2.deleteProgram(program);
      gl2.deleteShader(vertexShader);
      gl2.deleteShader(fragmentShader);
      if (positionBuffer) gl2.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className={`fixed inset-0 -z-10 ${className}`} aria-hidden="true" style={{ willChange: "transform" }} />;
}
