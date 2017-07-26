(function () {
	'use strict';

	var TWO_PI = Math.PI * 2;
	var DEG2RAD = Math.PI / 180;

	var SPEED = 3;

	var VEC3_ZERO = vec3.fromValues(0, 0, 0);
	var VEC3_UP = vec3.fromValues(0, 1, 0);

	var $loading = document.querySelector('.loading');
	var canvas = document.querySelector('canvas');
	var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

	var width, height;

	var animFrame;
	var lastTimestamp;

	var vertexShaderSource, fragmentShaderSource;
	var imgDiffuse, imgNormal, imgSpecular;

	var viewChanged = true;

	var projectionMatrix = mat4.create();
	var viewMatrix = mat4.create();
	var normalMatrix = mat3.create();
	var eye = vec3.create();

	var distance = 3;
	var yaw = 0, pitch = 0;
	var targetYaw = 0, targetPitch = 0;

	var program;
	var marsVertexPositionBuffer, marsVertexNormalBuffer, marsVertexTangentBuffer, marsVertexUvBuffer;
	var diffuseTexture, normalTexture, specularTexture;
	var projectionMatrixUniform, viewMatrixUniform, normalMatrixUniform, cameraPositionUniform, diffuseTextureUniform, normalTextureUniform, specularTextureUniform;
	var vertexPositionAttrib, vertexNormalAttrib, vertexTangentAttrib, vertexUvAttrib;
	var vertexCount;

	function calcEye() {
		vec3.set(eye,
			Math.cos(yaw) * Math.cos(pitch),
			Math.sin(pitch),
			Math.sin(yaw) * Math.cos(pitch)
		);
		vec3.scale(eye, eye, distance);
	}

	function update(timestamp) {
		animFrame = requestAnimationFrame(update);

		var deltaTime = lastTimestamp ? (timestamp - lastTimestamp) * 0.001 : 0;
		lastTimestamp = timestamp;

		//if(yaw !== targetYaw || pitch !== targetPitch) {
		yaw += (targetYaw - yaw) * SPEED * deltaTime;
		pitch += (targetPitch - pitch) * SPEED * deltaTime;

		calcEye();
		mat4.lookAt(viewMatrix, eye, VEC3_ZERO, VEC3_UP);

		mat3.fromMat4(normalMatrix, viewMatrix);
		mat3.invert(normalMatrix, normalMatrix);
		mat3.transpose(normalMatrix, normalMatrix);

		//viewChanged = false;
		//}

		gl.depthMask(true);
		gl.depthFunc(gl.LEQUAL);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(program);

		gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);
		gl.uniformMatrix4fv(viewMatrixUniform, false, viewMatrix);
		gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
		gl.uniform3fv(cameraPositionUniform, eye);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
		gl.uniform1i(diffuseTextureUniform, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, normalTexture);
		gl.uniform1i(normalTextureUniform, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, specularTexture);
		gl.uniform1i(specularTextureUniform, 2);

		gl.bindBuffer(gl.ARRAY_BUFFER, marsVertexPositionBuffer);
		gl.enableVertexAttribArray(vertexPositionAttrib);
		gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, marsVertexNormalBuffer);
		gl.enableVertexAttribArray(vertexNormalAttrib);
		gl.vertexAttribPointer(vertexNormalAttrib, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, marsVertexTangentBuffer);
		gl.enableVertexAttribArray(vertexTangentAttrib);
		gl.vertexAttribPointer(vertexTangentAttrib, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, marsVertexUvBuffer);
		gl.enableVertexAttribArray(vertexUvAttrib);
		gl.vertexAttribPointer(vertexUvAttrib, 2, gl.FLOAT, false, 0, 0);

		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
	}

	function play() {
		if(!animFrame) {
			lastTimestamp = 0;
			animFrame = requestAnimationFrame(update);
		}
	}

	function pause() {
		cancelAnimationFrame(animFrame);
		animFrame = null;
	}

	function resize() {
		var size = Math.min(window.innerWidth, window.innerHeight);
		width = size;
		height = size;
		canvas.width = width;
		canvas.height = height;
		gl.viewport(0, 0, width, height);
	}

	function createBuffer(target, data) {
		var buffer = gl.createBuffer();
		gl.bindBuffer(target, buffer);
		gl.bufferData(target, data, gl.STATIC_DRAW);
		return buffer;
	}

	function genMesh() {
		var positions = [];
		var normals = [];
		var tangents = [];
		var uvs = [];

		var verticalSegments = 30;
		var horitontalSegments = 40;

		function addVertex(segHoriz, segVert) {
			var yaw = segHoriz * TWO_PI / horitontalSegments;
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

			uvs.push(1 - segHoriz / horitontalSegments, segVert / verticalSegments);
		}

		for(var segVert = 0; segVert < verticalSegments; segVert++) {
			for(var segHoriz = 0; segHoriz < horitontalSegments; segHoriz++) {
				addVertex(segHoriz, segVert);
				addVertex(segHoriz + 1, segVert + 1);
				addVertex(segHoriz, segVert + 1);

				addVertex(segHoriz, segVert);
				addVertex(segHoriz + 1, segVert);
				addVertex(segHoriz + 1, segVert + 1);
			}
		}

		vertexCount = positions.length / 3;
		marsVertexPositionBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(positions));
		marsVertexNormalBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(normals));
		marsVertexTangentBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(tangents));
		marsVertexUvBuffer = createBuffer(gl.ARRAY_BUFFER, new Float32Array(uvs));
	}

	function createTexture(img) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	}

	function compileShader(type, source) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error(gl.getShaderInfoLog(shader));
		}
		return shader;
	}

	function compileProgram(vertexShaderSource, fragmentShaderSource) {
		var program = gl.createProgram();
		var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
		var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program));
		}
		return program;
	}

	function init() {
		resize();
		window.addEventListener('resize', resize);

		projectionMatrix = mat4.perspective(projectionMatrix, 45 * DEG2RAD, 1, 0.1, 100);
		calcEye();

		genMesh();

		diffuseTexture = createTexture(imgDiffuse);
		normalTexture = createTexture(imgNormal);
		specularTexture = createTexture(imgSpecular);

		program = compileProgram(vertexShaderSource, fragmentShaderSource);
		projectionMatrixUniform = gl.getUniformLocation(program, 'projectionMatrix');
		viewMatrixUniform = gl.getUniformLocation(program, 'viewMatrix');
		normalMatrixUniform = gl.getUniformLocation(program, 'normalMatrix');
		cameraPositionUniform = gl.getUniformLocation(program, 'cameraPosition');
		diffuseTextureUniform = gl.getUniformLocation(program, 'diffuseTexture');
		normalTextureUniform = gl.getUniformLocation(program, 'normalTexture');
		specularTextureUniform = gl.getUniformLocation(program, 'specularTexture');
		vertexPositionAttrib = gl.getAttribLocation(program, 'vertexPosition');
		vertexNormalAttrib = gl.getAttribLocation(program, 'vertexNormal');
		vertexTangentAttrib = gl.getAttribLocation(program, 'vertexTangent');
		vertexUvAttrib = gl.getAttribLocation(program, 'vertexUv');

		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		var isDown = false;
		var startX, startY;
		var startYaw, startPitch;
		function pointerDown(x, y) {
			if(!isDown) {
				isDown = true;

				startX = x;
				startY = y;
				startYaw = yaw;
				startPitch = pitch;
			}
		}

		function pointerMove(x, y) {
			if(isDown) {
				var diffX = x - startX;
				var diffY = y - startY;

				targetYaw = startYaw + diffX * 0.004;
				targetPitch = startPitch + diffY * 0.004;

				if(targetPitch > Math.PI / 2) {
					targetPitch = Math.PI / 2;
				} else if(targetPitch < -Math.PI / 2) {
					targetPitch = -Math.PI / 2;
				}

				viewChanged = true;
			}
		}

		function pointerUp(x, y) {
			if(isDown) {
				isDown = false;
			}
		}

		window.addEventListener('mousedown', function (evt) {
			pointerDown(evt.clientX, evt.clientY);
		});
		window.addEventListener('mousemove', function (evt) {
			pointerMove(evt.clientX, evt.clientY);
		});
		window.addEventListener('mouseup', function (evt) {
			pointerUp(evt.clientX, evt.clientY);
		});

		window.addEventListener('touchstart', function (evt) {
			var touch = evt.changedTouches[0];
			pointerDown(touch.clientX, touch.clientY);
		});
		window.addEventListener('touchmove', function (evt) {
			var touch = evt.changedTouches[0];
			pointerMove(touch.clientX, touch.clientY);
		});
		window.addEventListener('touchend', function (evt) {
			var touch = evt.changedTouches[0];
			pointerUp(touch.clientX, touch.clientY);
		});

		$loading.classList.add('hidden');
		canvas.classList.remove('hidden');
	}

	var loaders = {
		'img': function (url) {
			return new Promise(function (resolve, reject) {
				var img = new Image();
				img.onload = function () {
					img.onload = img.onerror = null;
					resolve(img);
				};
				img.onerror = function () {
					reject(new Error('Image failed to load'));
				};
				img.src = url;
			});
		},
		'txt': function (url) {
			return new Promise(function (resolve, reject) {
				var req = new XMLHttpRequest();
				req.onload = function () {
					if(req.status === 200) {
						resolve(req.responseText);
					} else {
						reject(new Error('Server error: ' + req.status));
					}
				};
				req.onerror = function () {
					reject(new Error('Client/network error'));
				};
				req.open('GET', url);
				req.send();
			});
		}
	};

	function load(type, url) {
		return loaders[type](url);
	}

	Promise.all([
		load('img', 'img/earth-diffuse.jpg'),
		load('img', 'img/earth-normal.png'),
		load('img', 'img/earth-specular.jpg'),
		load('txt', 'shaders/default.vert'),
		load('txt', 'shaders/default.frag')
	]).then(function (assets) {
		imgDiffuse = assets[0];
		imgNormal = assets[1];
		imgSpecular = assets[2];
		vertexShaderSource = assets[3];
		fragmentShaderSource = assets[4];

		init();
		play();
	}).catch(err => console.error(err));

})();
