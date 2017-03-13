import { ShaderMaterial, Uniform, Vector2 } from "three";

import fragment from "./glsl/shader.frag";
import vertex from "./glsl/shader.vert";

/**
 * A pixellation shader material.
 *
 * Original shader code by Robert Casanova:
 *  https://github.com/robertcasanova/pixelate-shader
 *
 * @class PixellationMaterial
 * @submodule materials
 * @extends ShaderMaterial
 * @constructor
 */

export class PixellationMaterial extends ShaderMaterial {

	constructor(resolution = new Vector2(1.0, 1.0)) {

		super({

			type: "PixelationMaterial",

			uniforms: {

				tDiffuse: new Uniform(null),
				intensity: new Uniform(1.0),
				resolution: new Uniform(resolution)

			},

			fragmentShader: fragment,
			vertexShader: vertex,

			depthWrite: false,
			depthTest: false

		});

	}

}
