// Motion blur by averaging sub-frames (WebGL 2).


/* =========================================================
   MOTION BLUR

   At high revolutions a part turns by tens of degrees between two
   screen frames, and the eye sees a strobing, stepping picture.
   Instead of one image the renderer draws several sub-frames spread
   over the time that the frame covers and averages them (a running
   mean, blended into the canvas), which gives the smear of a real
   exposure. This needs WebGL 2; with WebGL 1 the engine is drawn sharp.
   ========================================================= */

const BLUR_VERTEX_SHADER = `
  attribute vec2 aQuad;
  varying vec2 vUv;

  void main() {
    vUv = aQuad * 0.5 + 0.5;
    gl_Position = vec4(aQuad, 0.0, 1.0);
  }
`;

const BLUR_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTex;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uTex, vUv);
  }
`;

type MotionBlur = {
  render: (
    steps: number,
    width: number,
    height: number,
    bindScene: () => void,
    drawSub: (sub: number) => void
  ) => void;
  dispose: () => void;
};

// Sub-frames needed to look smooth: about one for every 7 degrees that the
// crank turns during the frame, never more than `cap`
export function blurSteps(crankDegreesPerFrame: number, cap: number) {
  return Math.max(1, Math.min(Math.floor(cap), Math.ceil(Math.abs(crankDegreesPerFrame) / 7)));
}

export function createMotionBlur(gl: WebGL2RenderingContext): MotionBlur | null {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const quad = gl.createBuffer();
  const texture = gl.createTexture();
  const depth = gl.createRenderbuffer();
  const target = gl.createFramebuffer();

  const release = () => {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    gl.deleteBuffer(quad);
    gl.deleteTexture(texture);
    gl.deleteRenderbuffer(depth);
    gl.deleteFramebuffer(target);
  };

  try {
    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);

      if (!shader) throw new Error("Could not create a blur shader.");

      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Blur shader compile failure.");
      }

      return shader;
    };

    gl.attachShader(program, compile(gl.VERTEX_SHADER, BLUR_VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, BLUR_FRAGMENT_SHADER));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Blur shader link failure.");
    }

    const position = gl.getAttribLocation(program, "aQuad");
    const sampler = gl.getUniformLocation(program, "uTex");

    if (position < 0 || sampler === null) {
      throw new Error("Blur shader is missing a location.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    let width = 0;
    let height = 0;
    let complete = false;

    // The off-screen target: an RGBA texture and a 24-bit depth buffer
    const resize = (w: number, h: number) => {
      if (w === width && h === height) return;

      width = w;
      height = h;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);

      complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const render = (
      steps: number,
      w: number,
      h: number,
      bindScene: () => void,
      drawSub: (sub: number) => void
    ) => {
      resize(w, h);

      // No usable off-screen target: draw one sharp frame instead
      if (!complete) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        bindScene();
        drawSub(Math.floor(steps / 2));
        return;
      }

      for (let j = 0; j < steps; j++) {
        // 1. One sharp sub-frame, drawn off screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, target);
        gl.viewport(0, 0, w, h);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        bindScene();
        drawSub(j);

        // 2. Blended into the canvas as a running mean: after sub-frame j
        // the canvas holds the average of the first j + 1 sub-frames
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        gl.disable(gl.DEPTH_TEST);

        if (j === 0) {
          gl.disable(gl.BLEND);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
          gl.enable(gl.BLEND);
          gl.blendColor(0, 0, 0, 1 / (j + 1));
          gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
        }

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(sampler, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(position);
      }

      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
    };

    return { render, dispose: release };
  } catch (error) {
    console.warn("Motion blur disabled:", error);
    release();

    return null;
  }
}
