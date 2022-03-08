import { Color, LinearFilter, RepeatWrapping, Uniform, UnsignedByteType, WebGLRenderTarget } from "three";
import { KernelSize, Resolution, Selection } from "../core";
import { DepthComparisonMaterial, OutlineMaterial } from "../materials";
import { KawaseBlurPass, ClearPass, DepthPass, RenderPass, ShaderPass } from "../passes";
import { getTextureDecoding } from "../utils/getTextureDecoding";
import { BlendFunction } from "./blending/BlendFunction";
import { Effect } from "./Effect";

import fragmentShader from "./glsl/outline/shader.frag";
import vertexShader from "./glsl/outline/shader.vert";

/**
 * An outline effect.
 */

export class OutlineEffect extends Effect {

	/**
	 * Constructs a new outline effect.
	 *
	 * @param {Scene} scene - The main scene.
	 * @param {Camera} camera - The main camera.
	 * @param {Object} [options] - The options.
	 * @param {BlendFunction} [options.blendFunction=BlendFunction.SCREEN] - The blend function. Use `BlendFunction.ALPHA` for dark outlines.
	 * @param {Number} [options.patternTexture=null] - A pattern texture.
	 * @param {Number} [options.patternScale=1.0] - The pattern scale.
	 * @param {Number} [options.edgeStrength=1.0] - The edge strength.
	 * @param {Number} [options.pulseSpeed=0.0] - The pulse speed. A value of zero disables the pulse effect.
	 * @param {Number} [options.visibleEdgeColor=0xffffff] - The color of visible edges.
	 * @param {Number} [options.hiddenEdgeColor=0x22090a] - The color of hidden edges.
	 * @param {Number} [options.resolutionScale=0.5] - Deprecated. Use height or width instead.
	 * @param {Number} [options.width=Resolution.AUTO_SIZE] - The render width.
	 * @param {Number} [options.height=Resolution.AUTO_SIZE] - The render height.
	 * @param {KernelSize} [options.kernelSize=KernelSize.VERY_SMALL] - The blur kernel size.
	 * @param {Boolean} [options.blur=false] - Whether the outline should be blurred.
	 * @param {Boolean} [options.xRay=true] - Whether occluded parts of selected objects should be visible.
	 */

	constructor(scene, camera, {
		blendFunction = BlendFunction.SCREEN,
		patternTexture = null,
		patternScale = 1.0,
		edgeStrength = 1.0,
		pulseSpeed = 0.0,
		visibleEdgeColor = 0xffffff,
		hiddenEdgeColor = 0x22090a,
		resolutionScale = 0.5,
		width = Resolution.AUTO_SIZE,
		height = Resolution.AUTO_SIZE,
		kernelSize = KernelSize.VERY_SMALL,
		blur = false,
		xRay = true
	} = {}) {

		super("OutlineEffect", fragmentShader, {
			uniforms: new Map([
				["maskTexture", new Uniform(null)],
				["edgeTexture", new Uniform(null)],
				["edgeStrength", new Uniform(edgeStrength)],
				["visibleEdgeColor", new Uniform(new Color(visibleEdgeColor))],
				["hiddenEdgeColor", new Uniform(new Color(hiddenEdgeColor))],
				["pulse", new Uniform(1.0)],
				["patternScale", new Uniform(patternScale)],
				["patternTexture", new Uniform(null)]
			])
		});

		// Handle alpha blending.
		this.blendMode.addEventListener("change", (event) => {

			if(this.blendMode.getBlendFunction() === BlendFunction.ALPHA) {

				this.defines.set("ALPHA", "1");

			} else {

				this.defines.delete("ALPHA");

			}

			this.setChanged();

		});

		this.blendMode.setBlendFunction(blendFunction);
		this.patternTexture = patternTexture;
		this.xRay = xRay;

		/**
		 * The main scene.
		 *
		 * @type {Scene}
		 * @private
		 */

		this.scene = scene;

		/**
		 * The main camera.
		 *
		 * @type {Camera}
		 * @private
		 */

		this.camera = camera;

		/**
		 * A render target for the outline mask.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */

		this.renderTargetMask = new WebGLRenderTarget(1, 1, {
			minFilter: LinearFilter,
			magFilter: LinearFilter,
			stencilBuffer: false
		});

		this.renderTargetMask.texture.name = "Outline.Mask";
		this.uniforms.get("maskTexture").value = this.renderTargetMask.texture;

		/**
		 * A render target for the edge detection.
		 *
		 * @type {WebGLRenderTarget}
		 * @private
		 */

		this.renderTargetOutline = this.renderTargetMask.clone();
		this.renderTargetOutline.texture.name = "Outline.Edges";
		this.renderTargetOutline.depthBuffer = false;
		this.uniforms.get("edgeTexture").value = this.renderTargetOutline.texture;

		/**
		 * A clear pass.
		 *
		 * @type {ClearPass}
		 * @private
		 */

		this.clearPass = new ClearPass();
		this.clearPass.overrideClearColor = new Color(0x000000);
		this.clearPass.overrideClearAlpha = 1;

		/**
		 * A depth pass.
		 *
		 * @type {DepthPass}
		 * @private
		 */

		this.depthPass = new DepthPass(scene, camera);

		/**
		 * A depth comparison mask pass.
		 *
		 * @type {RenderPass}
		 * @private
		 */

		this.maskPass = new RenderPass(scene, camera, new DepthComparisonMaterial(this.depthPass.texture, camera));
		const clearPass = this.maskPass.clearPass;
		clearPass.overrideClearColor = new Color(0xffffff);
		clearPass.overrideClearAlpha = 1;

		/**
		 * A blur pass.
		 *
		 * @type {KawaseBlurPass}
		 * @deprecated Use getBlurPass() instead.
		 */

		this.blurPass = new KawaseBlurPass({ resolutionScale, width, height, kernelSize });
		this.blurPass.enabled = blur;
		const resolution = this.blurPass.resolution;
		resolution.addEventListener("change", (e) => this.setSize(resolution.baseWidth, resolution.baseHeight));

		/**
		 * An outline detection pass.
		 *
		 * @type {ShaderPass}
		 * @private
		 */

		this.outlinePass = new ShaderPass(new OutlineMaterial());
		const outlineMaterial = this.outlinePass.fullscreenMaterial;
		outlineMaterial.inputBuffer = this.renderTargetMask.texture;

		/**
		 * The current animation time.
		 *
		 * @type {Number}
		 * @private
		 */

		this.time = 0;

		/**
		 * A selection of objects that will be outlined.
		 *
		 * The default layer of this selection is 10.
		 *
		 * @type {Selection}
		 * @deprecated Use getSelection() instead.
		 */

		this.selection = new Selection();
		this.selection.layer = 10;

		/**
		 * The pulse speed. Set to 0 to disable.
		 *
		 * @type {Number}
		 * @deprecated Use getPulseSpeed() and setPulseSpeed() instead.
		 */

		this.pulseSpeed = pulseSpeed;

	}

	/**
	 * The resolution of this effect.
	 *
	 * @deprecated Use getResolution() instead.
	 * @type {Resolution}
	 */

	get resolution() {

		return this.blurPass.resolution;

	}

	/**
	 * Returns the resolution.
	 *
	 * @return {Resizer} The resolution.
	 */

	getResolution() {

		return this.blurPass.getResolution();

	}

	/**
	 * Returns the blur pass.
	 *
	 * @return {KawaseBlurPass} The blur pass.
	 */

	getBlurPass() {

		return this.blurPass;

	}

	/**
	 * Returns the selection.
	 *
	 * @return {Selection} The selection.
	 */

	getSelection() {

		return this.selection;

	}

	/**
	 * Returns the pulse speed.
	 *
	 * @return {Number} The speed.
	 */

	getPulseSpeed() {

		return this.pulseSpeed;

	}

	/**
	 * Sets the pulse speed. Set to zero to disable.
	 *
	 * @param {Number} value - The speed.
	 */

	setPulseSpeed(value) {

		this.pulseSpeed = value;

	}

	/**
	 * The current width of the internal render targets.
	 *
	 * @type {Number}
	 * @deprecated Use getResolution().getWidth() instead.
	 */

	get width() {

		return this.resolution.width;

	}

	set width(value) {

		this.resolution.preferredWidth = value;

	}

	/**
	 * The current height of the internal render targets.
	 *
	 * @type {Number}
	 * @deprecated Use getResolution().getHeight() instead.
	 */

	get height() {

		return this.resolution.height;

	}

	set height(value) {

		this.resolution.preferredHeight = value;

	}

	/**
	 * The selection layer.
	 *
	 * @type {Number}
	 * @deprecated Use getSelection().getLayer() instead.
	 */

	get selectionLayer() {

		return this.selection.layer;

	}

	set selectionLayer(value) {

		this.selection.layer = value;

	}

	/**
	 * Indicates whether dithering is enabled.
	 *
	 * @type {Boolean}
	 * @deprecated
	 */

	get dithering() {

		return this.blurPass.dithering;

	}

	set dithering(value) {

		this.blurPass.dithering = value;

	}

	/**
	 * The blur kernel size.
	 *
	 * @type {KernelSize}
	 * @deprecated Use getBlurPass().getKernelSize() instead.
	 */

	get kernelSize() {

		return this.blurPass.kernelSize;

	}

	set kernelSize(value) {

		this.blurPass.kernelSize = value;

	}

	/**
	 * Indicates whether the outlines should be blurred.
	 *
	 * @type {Boolean}
	 * @deprecated Use getBlurPass().isEnabled() instead.
	 */

	get blur() {

		return this.blurPass.enabled;

	}

	set blur(value) {

		this.blurPass.enabled = value;

	}

	/**
	 * Indicates whether X-ray mode is enabled.
	 *
	 * @type {Boolean}
	 * @deprecated Use isXRayEnabled() instead.
	 */

	get xRay() {

		return this.defines.has("X_RAY");

	}

	set xRay(value) {

		if(this.xRay !== value) {

			if(value) {

				this.defines.set("X_RAY", "1");

			} else {

				this.defines.delete("X_RAY");

			}

			this.setChanged();

		}

	}

	/**
	 * Indicates whether X-ray mode is enabled.
	 *
	 * @return {Boolean} Whether X-ray mode is enabled.
	 */

	isXRayEnabled() {

		return this.xRay;

	}

	/**
	 * Enables or disables X-ray outlines.
	 *
	 * @param {Boolean} value - Whether X-ray should be enabled.
	 */

	setXRayEnabled(value) {

		this.xRay = value;

	}

	/**
	 * Sets the pattern texture.
	 *
	 * @param {Texture} texture - The new texture.
	 */

	setPatternTexture(texture) {

		if(texture !== null) {

			texture.wrapS = texture.wrapT = RepeatWrapping;

			this.defines.set("USE_PATTERN", "1");
			this.uniforms.get("patternTexture").value = texture;
			this.setVertexShader(vertexShader);

		} else {

			this.defines.delete("USE_PATTERN");
			this.uniforms.get("patternTexture").value = null;
			this.setVertexShader(null);

		}

		if(this.renderer !== null) {

			const decoding = getTextureDecoding(texture, this.renderer.capabilities.isWebGL2);
			this.defines.set("texelToLinear(texel)", decoding);

		}

		this.setChanged();

	}

	/**
	 * Returns the current resolution scale.
	 *
	 * @return {Number} The resolution scale.
	 * @deprecated Use getResolution().setPreferredWidth() or getResolution().setPreferredHeight() instead.
	 */

	getResolutionScale() {

		return this.resolution.scale;

	}

	/**
	 * Sets the resolution scale.
	 *
	 * @param {Number} scale - The new resolution scale.
	 * @deprecated Use getResolution().setPreferredWidth() or getResolution().setPreferredHeight() instead.
	 */

	setResolutionScale(scale) {

		this.resolution.scale = scale;

	}

	/**
	 * Clears the current selection and selects a list of objects.
	 *
	 * @param {Object3D[]} objects - The objects that should be outlined. This array will be copied.
	 * @return {OutlinePass} This pass.
	 * @deprecated Use getSelection().set() instead.
	 */

	setSelection(objects) {

		this.selection.set(objects);
		return this;

	}

	/**
	 * Clears the list of selected objects.
	 *
	 * @return {OutlinePass} This pass.
	 * @deprecated Use getSelection().clear() instead.
	 */

	clearSelection() {

		this.selection.clear();
		return this;

	}

	/**
	 * Selects an object.
	 *
	 * @param {Object3D} object - The object that should be outlined.
	 * @return {OutlinePass} This pass.
	 * @deprecated Use getSelection().add() instead.
	 */

	selectObject(object) {

		this.selection.add(object);
		return this;

	}

	/**
	 * Deselects an object.
	 *
	 * @param {Object3D} object - The object that should no longer be outlined.
	 * @return {OutlinePass} This pass.
	 * @deprecated Use getSelection().delete() instead.
	 */

	deselectObject(object) {

		this.selection.delete(object);
		return this;

	}

	/**
	 * Updates this effect.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {WebGLRenderTarget} inputBuffer - A frame buffer that contains the result of the previous pass.
	 * @param {Number} [deltaTime] - The time between the last frame and the current one in seconds.
	 */

	update(renderer, inputBuffer, deltaTime) {

		const scene = this.scene;
		const camera = this.camera;
		const selection = this.selection;
		const uniforms = this.uniforms;
		const pulse = uniforms.get("pulse");

		const background = scene.background;
		const mask = camera.layers.mask;

		if(selection.size > 0) {

			scene.background = null;
			pulse.value = 1;

			if(this.pulseSpeed > 0) {

				pulse.value = Math.cos(this.time * this.pulseSpeed * 10.0) * 0.375 + 0.625;

			}

			this.time += deltaTime;

			// Render a custom depth texture and ignore selected objects.
			selection.setVisible(false);
			this.depthPass.render(renderer);
			selection.setVisible(true);

			// Compare the depth of the selected objects with the depth texture.
			camera.layers.set(selection.layer);
			this.maskPass.render(renderer, this.renderTargetMask);

			// Restore the camera layer mask and the scene background.
			camera.layers.mask = mask;
			scene.background = background;

			// Detect the outline.
			this.outlinePass.render(renderer, null, this.renderTargetOutline);

			if(this.blurPass.enabled) {

				this.blurPass.render(renderer, this.renderTargetOutline, this.renderTargetOutline);

			}

		} else if(this.time > 0) {

			this.clearPass.render(renderer, this.renderTargetMask);
			this.time = 0;

		}

	}

	/**
	 * Updates the size of internal render targets.
	 *
	 * @param {Number} width - The width.
	 * @param {Number} height - The height.
	 */

	setSize(width, height) {

		this.blurPass.setSize(width, height);
		this.renderTargetMask.setSize(width, height);

		const resolution = this.resolution;
		resolution.setBaseSize(width, height);
		const w = resolution.width, h = resolution.height;

		this.depthPass.setSize(w, h);
		this.renderTargetOutline.setSize(w, h);
		this.outlinePass.fullscreenMaterial.setSize(w, h);

	}

	/**
	 * Performs initialization tasks.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {Boolean} alpha - Whether the renderer uses the alpha channel or not.
	 * @param {Number} frameBufferType - The type of the main frame buffers.
	 */

	initialize(renderer, alpha, frameBufferType) {

		const texture = this.uniforms.get("patternTexture").value;
		const decoding = getTextureDecoding(texture, renderer.capabilities.isWebGL2);
		this.defines.set("texelToLinear(texel)", decoding);

		// No need for high precision: the blur pass operates on a mask texture.
		this.blurPass.initialize(renderer, alpha, UnsignedByteType);

		if(frameBufferType !== undefined) {

			// These passes ignore the buffer type.
			this.depthPass.initialize(renderer, alpha, frameBufferType);
			this.maskPass.initialize(renderer, alpha, frameBufferType);
			this.outlinePass.initialize(renderer, alpha, frameBufferType);

		}

	}

}
