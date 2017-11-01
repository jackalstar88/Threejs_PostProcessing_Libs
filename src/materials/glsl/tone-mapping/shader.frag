#include <common>

// https://en.wikipedia.org/wiki/Relative_luminance
float linearToRelativeLuminance(const in vec3 color) {

	vec3 weights = vec3(0.2126, 0.7152, 0.0722);

	return dot(weights, color.rgb);

}

uniform sampler2D tDiffuse;
uniform float middleGrey;
uniform float maxLuminance;

#ifdef ADAPTED_LUMINANCE

	uniform sampler2D luminanceMap;

#else

	uniform float averageLuminance;

#endif

varying vec2 vUv;

vec3 toneMap(vec3 c) {

	#ifdef ADAPTED_LUMINANCE

		// Get the calculated average luminance by sampling the center.
		float lumAvg = texture2D(luminanceMap, vec2(0.5)).r;

	#else

		float lumAvg = averageLuminance;

	#endif

	// Calculate the luminance of the current pixel.
	float lumPixel = linearToRelativeLuminance(c);

	// Apply the modified operator (Reinhard Eq. 4).
	float lumScaled = (lumPixel * middleGrey) / lumAvg;

	float lumCompressed = (lumScaled * (1.0 + (lumScaled / (maxLuminance * maxLuminance)))) / (1.0 + lumScaled);

	return lumCompressed * c;

}

void main() {

	vec4 texel = texture2D(tDiffuse, vUv);
	gl_FragColor = vec4(toneMap(texel.rgb), texel.a);

}
