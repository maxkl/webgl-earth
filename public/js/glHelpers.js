(function (helpers) {
	'use strict';

	var TWO_PI = Math.PI * 2;

	helpers.createBuffer = function (gl, target, data, usage) {
		var buffer = gl.createBuffer();
		gl.bindBuffer(target, buffer);
		gl.bufferData(target, data, usage);
		return buffer;
	}

	helpers.makeSphereMesh = function (verticalSegments, horizontalSegments) {
		var positions = [];
		var normals = [];
		var tangents = [];
		var uvs = [];

		function addVertex(segHoriz, segVert) {
			var yaw = segHoriz * TWO_PI / horizontalSegments;
			var pitch = Math.PI / 2 - segVert * Math.PI / verticalSegments;
			var x = Math.cos(yaw) * Math.cos(pitch);
			var y = Math.sin(pitch);
			var z = Math.sin(yaw) * Math.cos(pitch);
			positions.push(x, y, z);

			normals.push(x, y, z);

			var tx = z;
			var tz = -x;
			var l = Math.sqrt(tx * tx + tz * tz);
			tx = tx / l;
			tz = tz / l;
			tangents.push(tx, 0, tz);

			uvs.push(1 - segHoriz / horizontalSegments, segVert / verticalSegments);
		}

		for(var segVert = 0; segVert < verticalSegments; segVert++) {
			for(var segHoriz = 0; segHoriz < horizontalSegments; segHoriz++) {
				addVertex(segHoriz, segVert);
				addVertex(segHoriz + 1, segVert + 1);
				addVertex(segHoriz, segVert + 1);

				addVertex(segHoriz, segVert);
				addVertex(segHoriz + 1, segVert);
				addVertex(segHoriz + 1, segVert + 1);
			}
		}

		return {
			vertexCount: positions.length / 3,
			positions: positions,
			normals: normals,
			tangents: tangents,
			uvs: uvs
		};
	}

	helpers.createTexture = function (gl, img, generateMipmaps) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		if (generateMipmaps) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	}

	helpers.compileShader = function (gl, type, source) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(gl.getShaderInfoLog(shader));
		}
		return shader;
	}

	helpers.compileProgram = function (gl, vertexShaderSource, fragmentShaderSource) {
		var program = gl.createProgram();
		var vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program));
		}
		return program;
	}

})(window);
