precision mediump float;

#define NORMAL_MAP_SCALE 0.3

varying vec3 fragmentLightDirection;
varying vec3 fragmentViewDirection;
varying vec2 fragmentUv;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D specularTexture;

void main() {
	vec3 lightColor = vec3(1.0, 1.0, 1.0);
	float lightIntensity = 1.5;

	vec3 normal = normalize((texture2D(normalTexture, fragmentUv).rgb * 2.0 - 1.0) * vec3(NORMAL_MAP_SCALE, NORMAL_MAP_SCALE, 1.0));

	vec3 diffuseColor = texture2D(diffuseTexture, fragmentUv).rgb;
	vec3 specularColor = texture2D(specularTexture, fragmentUv).rgb;

	vec3 ambientComponent = 0.1 * diffuseColor;

	vec3 normalizedLightDirection = normalize(fragmentLightDirection);
	float diffuseBrightness = max(0.0, dot(normal, normalizedLightDirection));
	vec3 diffuseComponent = diffuseBrightness * lightIntensity * lightColor * diffuseColor;

	vec3 normalizedViewDirection = normalize(fragmentViewDirection);
	float specularBrightness = max(0.0, dot(reflect(-normalizedLightDirection, normal), normalizedViewDirection));
	vec3 specularComponent = specularColor * 0.5 * pow(specularBrightness, 4.0);

	gl_FragColor = vec4(ambientComponent + diffuseComponent + specularComponent, 1.0);
}
