precision mediump float;

varying vec3 fragmentLightDirection;
varying vec3 fragmentViewDirection;
varying vec2 fragmentUv;

uniform vec3 lightColor;
uniform float lightIntensity;
uniform float specularity;
uniform float specularIntensity;
uniform float normalMapScale;
uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D specularTexture;

void main() {
	vec3 normal = normalize((texture2D(normalTexture, fragmentUv).rgb * 2.0 - 1.0) * vec3(normalMapScale, normalMapScale, 1.0));

	vec3 diffuseColor = texture2D(diffuseTexture, fragmentUv).rgb;
	vec3 specularColor = texture2D(specularTexture, fragmentUv).rgb;

	vec3 ambientComponent = 0.1 * diffuseColor;

	vec3 normalizedLightDirection = normalize(fragmentLightDirection);
	float diffuseBrightness = max(0.0, dot(normal, normalizedLightDirection));
	vec3 diffuseComponent = diffuseBrightness * lightIntensity * lightColor * diffuseColor;

	vec3 normalizedViewDirection = normalize(fragmentViewDirection);
	float specularBrightness = max(0.0, dot(reflect(-normalizedLightDirection, normal), normalizedViewDirection));
	vec3 specularComponent = specularColor * specularIntensity * pow(specularBrightness, specularity);

	gl_FragColor = vec4(ambientComponent + diffuseComponent + specularComponent, 1.0);
}
