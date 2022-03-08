import { BlendFunction } from "./blending/BlendFunction";
import { Effect } from "./Effect";

import fragmentShader from "./glsl/noise/shader.frag";

/**
 * A noise effect.
 */

export class NoiseEffect extends Effect {

	/**
	 * Constructs a new noise effect.
	 *
	 * @param {Object} [options] - The options.
	 * @param {BlendFunction} [options.blendFunction=BlendFunction.SCREEN] - The blend function of this effect.
	 * @param {Boolean} [options.premultiply=false] - Whether the noise should be multiplied with the input colors prior to blending.
	 */

	constructor({ blendFunction = BlendFunction.SCREEN, premultiply = false } = {}) {

		super("NoiseEffect", fragmentShader, { blendFunction });
		this.premultiply = premultiply;

	}

	/**
	 * Indicates whether noise will be multiplied with the input colors prior to blending.
	 *
	 * @type {Boolean}
	 * @deprecated Use isPremultiplied() instead.
	 */

	get premultiply() {

		return this.defines.has("PREMULTIPLY");

	}

	set premultiply(value) {

		if(this.premultiply !== value) {

			if(value) {

				this.defines.set("PREMULTIPLY", "1");

			} else {

				this.defines.delete("PREMULTIPLY");

			}

			this.setChanged();

		}

	}

	/**
	 * Indicates whether noise will be multiplied with the input colors prior to blending.
	 *
	 * @return {Boolean} Whether noise is premultiplied.
	 */

	isPremultiplied() {

		return this.premultiply;

	}

	/**
	 * Controls whether noise should be multiplied with the input colors prior to blending.
	 *
	 * @param {Boolean} value - Whether noise should be premultiplied.
	 */

	setPremultiplied(value) {

		this.premultiply = value;

	}

}
