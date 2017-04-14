precision mediump float;

varying vec3 fragmentLightDirection;
varying vec2 fragmentUv;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;

void main() {
	vec3 lightColor = vec3(1.0, 1.0, 0.8);
	float lightIntensity = 1.5;

	vec3 normal = normalize((texture2D(normalTexture, fragmentUv).rgb * 2.0 - 1.0) * vec3(10.0, 10.0, 1.0));

	vec3 color = texture2D(diffuseTexture, fragmentUv).rgb;

	vec3 ambientComponent = 0.1 * color;

	vec3 normalizedLightDirection = normalize(fragmentLightDirection);
	float diffuseBrightness = max(0.0, dot(normal, normalizedLightDirection));
	vec3 diffuseComponent = diffuseBrightness * lightIntensity * lightColor * color;

	gl_FragColor = vec4(ambientComponent + diffuseComponent, 1.0);
}
