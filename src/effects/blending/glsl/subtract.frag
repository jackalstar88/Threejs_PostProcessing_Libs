vec4 blend(const in vec4 x, const in vec4 y, const in float opacity) {

	return mix(x, max(x + y - 1.0, 0.0), opacity);

}
