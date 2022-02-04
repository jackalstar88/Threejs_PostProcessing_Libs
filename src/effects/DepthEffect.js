import { BlendFunction } from "./blending/BlendFunction";
import { Effect, EffectAttribute } from "./Effect";

import fragmentShader from "./glsl/depth/shader.frag";

/**
 * A depth visualization effect.
 *
 * Useful for debugging.
 */

export class DepthEffect extends Effect {

	/**
	 * Constructs a new depth effect.
	 *
	 * @param {Object} [options] - The options.
	 * @param {BlendFunction} [options.blendFunction=BlendFunction.NORMAL] - The blend function of this effect.
	 * @param {Boolean} [options.inverted=false] - Whether the depth should be inverted.
	 */

	constructor({ blendFunction = BlendFunction.NORMAL, inverted = false } = {}) {

		super("DepthEffect", fragmentShader, {
			blendFunction,
			attributes: EffectAttribute.DEPTH
		});

		this.setInverted(inverted);

	}

	/**
	 * Indicates whether depth should be inverted.
	 *
	 * @type {Boolean}
	 * @deprecated Use isInverted() instead.
	 */

	get inverted() {

		return this.isInverted;

	}

	/**
	 * Enables or disables depth inversion.
	 *
	 * @type {Boolean}
	 * @deprecated Use setInverted() instead.
	 */

	set inverted(value) {

		this.setInverted(value);

	}

	/**
	 * Indicates whether the rendered depth is inverted.
	 *
	 * @return {Boolean} Whether the rendered depth is inverted.
	 */

	isInverted() {

		return this.defines.has("INVERTED");

	}

	/**
	 * Enables or disables depth inversion.
	 *
	 * @param {Boolean} value - Whether depth should be inverted.
	 */

	setInverted(value) {

		if(this.inverted !== value) {

			if(value) {

				this.defines.set("INVERTED", "1");

			} else {

				this.defines.delete("INVERTED");

			}

			this.setChanged();

		}

	}

}
