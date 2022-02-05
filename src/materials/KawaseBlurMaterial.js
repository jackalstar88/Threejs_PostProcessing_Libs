import { NoBlending, ShaderMaterial, Uniform, Vector2 } from "three";

import fragmentShader from "./glsl/convolution/kawase.frag";
import vertexShader from "./glsl/convolution/kawase.vert";

/**
 * An optimised convolution shader material.
 *
 * Based on the GDC2003 Presentation by Masaki Kawase, Bunkasha Games:
 *  Frame Buffer Postprocessing Effects in DOUBLE-S.T.E.A.L (Wreckless)
 * and an article by Filip Strugar, Intel:
 *  An investigation of fast real-time GPU-based image blur algorithms
 *
 * Further modified according to Apple's [Best Practices for Shaders](https://goo.gl/lmRoM5).
 *
 * @todo Remove dithering code from fragment shader.
 * @implements {Resizable}
 */

export class KawaseBlurMaterial extends ShaderMaterial {

	/**
	 * Constructs a new convolution material.
	 *
	 * TODO Remove texelSize param.
	 * @param {Vector2} [texelSize] - Deprecated.
	 */

	constructor(texelSize = new Vector2()) {

		super({
			name: "KawaseBlurMaterial",
			uniforms: {
				inputBuffer: new Uniform(null),
				texelSize: new Uniform(new Vector2()),
				halfTexelSize: new Uniform(new Vector2()),
				kernel: new Uniform(0.0),
				scale: new Uniform(1.0)
			},
			blending: NoBlending,
			depthWrite: false,
			depthTest: false,
			fragmentShader,
			vertexShader
		});

		/** @ignore */
		this.toneMapped = false;

		this.setTexelSize(texelSize.x, texelSize.y);

	}

	/**
	 * Returns the kernel.
	 *
	 * @return {Float32Array} The kernel.
	 * @deprecated Implementation detail, removed with no replacement.
	 */

	getKernel() {

		return 0.0;

	}

	/**
	 * Sets the texel size.
	 *
	 * @deprecated Use setSize() instead.
	 * @param {Number} x - The texel width.
	 * @param {Number} y - The texel height.
	 */

	setTexelSize(x, y) {

		this.uniforms.texelSize.value.set(x, y);
		this.uniforms.halfTexelSize.value.set(x, y).multiplyScalar(0.5);

	}

	/**
	 * Sets the size of this object.
	 *
	 * @param {Number} width - The width.
	 * @param {Number} height - The height.
	 */

	setSize(width, height) {

		const uniforms = this.uniforms;
		uniforms.texelSize.value.set(1.0 / width, 1.0 / height);
		uniforms.halfTexelSize.value.copy(uniforms.texelSize.value).multiplyScalar(0.5);

	}

}
