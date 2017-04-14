precision mediump float;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;

attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec3 vertexTangent;
attribute vec2 vertexUv;

varying vec3 fragmentLightDirection;
varying vec2 fragmentUv;

mediump mat3 transpose(in mediump mat3 inMatrix) {
	mediump vec3 i0 = inMatrix[0];
    mediump vec3 i1 = inMatrix[1];
    mediump vec3 i2 = inMatrix[2];

    mediump mat3 outMatrix = mat3(
		vec3(i0.x, i1.x, i2.x),
		vec3(i0.y, i1.y, i2.y),
		vec3(i0.z, i1.z, i2.z)
	);

    return outMatrix;
}

void main() {
	vec3 lightDirection = normalize(vec3(1.0, 0.0, 0.7));
	//lightDirection = (viewMatrix * vec4(lightDirection, 0.0)).xyz;

	vec3 N = normalize(normalMatrix * vertexNormal);
	vec3 T = normalize(normalMatrix * vertexTangent);
	vec3 B = normalize(normalMatrix * cross(vertexNormal, vertexTangent));
	mat3 TBN = transpose(mat3(T, B, N));

	fragmentLightDirection = TBN * lightDirection;

	fragmentUv = vertexUv;

	gl_Position = projectionMatrix * viewMatrix * vec4(vertexPosition, 1.0);
}
