(function () {
	'use strict';

	var TWO_PI = Math.PI * 2;
	var DEG2RAD = Math.PI / 180;

	var SPEED = 3;

	var VEC3_ZERO = vec3.fromValues(0, 0, 0);
	var VEC3_UP = vec3.fromValues(0, 1, 0);

	var $loading = document.querySelector('.loading');
	var $themeSelect = document.querySelector('#theme');
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
	var projectionMatrixUniform, viewMatrixUniform, normalMatrixUniform, cameraPositionUniform, lightColorUniform, lightIntensityUniform, ambientIntensityUniform, specularityUniform, specularIntensityUniform, normalMapScaleUniform, diffuseTextureUniform, normalTextureUniform, specularTextureUniform;
	var vertexPositionAttrib, vertexNormalAttrib, vertexTangentAttrib, vertexUvAttrib;
	var vertexCount;

	var theme;

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

		yaw += (targetYaw - yaw) * SPEED * deltaTime;
		pitch += (targetPitch - pitch) * SPEED * deltaTime;

		calcEye();
		mat4.lookAt(viewMatrix, eye, VEC3_ZERO, VEC3_UP);

		mat3.fromMat4(normalMatrix, viewMatrix);
		mat3.invert(normalMatrix, normalMatrix);
		mat3.transpose(normalMatrix, normalMatrix);

		gl.depthMask(true);
		gl.depthFunc(gl.LEQUAL);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.useProgram(program);

		gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);
		gl.uniformMatrix4fv(viewMatrixUniform, false, viewMatrix);
		gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
		gl.uniform3fv(cameraPositionUniform, eye);

		gl.uniform3fv(lightColorUniform, theme.light.color);
		gl.uniform1f(lightIntensityUniform, theme.light.intensity);
		gl.uniform1f(ambientIntensityUniform, theme.material.ambientIntensity);
		gl.uniform1f(specularityUniform, theme.material.specularity);
		gl.uniform1f(specularIntensityUniform, theme.material.specularIntensity);
		gl.uniform1f(normalMapScaleUniform, theme.material.normalMapScale);

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

	function genMesh() {
		var data = makeSphereMesh(30, 40);

		vertexCount = data.vertexCount;
		marsVertexPositionBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);
		marsVertexNormalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);
		marsVertexTangentBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(data.tangents), gl.STATIC_DRAW);
		marsVertexUvBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(data.uvs), gl.STATIC_DRAW);
	}

	function initTheme(newTheme) {
		diffuseTexture = createTexture(gl, imgDiffuse);
		normalTexture = createTexture(gl, imgNormal);
		specularTexture = createTexture(gl, imgSpecular);

		theme = newTheme;

		$loading.classList.add('hidden');
		canvas.classList.remove('hidden');
	}

	function initCommon() {
		resize();
		window.addEventListener('resize', resize);

		projectionMatrix = mat4.perspective(projectionMatrix, 45 * DEG2RAD, 1, 0.1, 100);
		calcEye();

		genMesh();

		program = compileProgram(gl, vertexShaderSource, fragmentShaderSource);
		projectionMatrixUniform = gl.getUniformLocation(program, 'projectionMatrix');
		viewMatrixUniform = gl.getUniformLocation(program, 'viewMatrix');
		normalMatrixUniform = gl.getUniformLocation(program, 'normalMatrix');
		cameraPositionUniform = gl.getUniformLocation(program, 'cameraPosition');
		lightColorUniform = gl.getUniformLocation(program, 'lightColor');
		lightIntensityUniform = gl.getUniformLocation(program, 'lightIntensity');
		ambientIntensityUniform = gl.getUniformLocation(program, 'ambientIntensity');
		specularityUniform = gl.getUniformLocation(program, 'specularity');
		specularIntensityUniform = gl.getUniformLocation(program, 'specularIntensity');
		normalMapScaleUniform = gl.getUniformLocation(program, 'normalMapScale');
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

		canvas.addEventListener('mousedown', function (evt) {
			pointerDown(evt.clientX, evt.clientY);
		});
		window.addEventListener('mousemove', function (evt) {
			pointerMove(evt.clientX, evt.clientY);
		});
		window.addEventListener('mouseup', function (evt) {
			pointerUp(evt.clientX, evt.clientY);
		});

		canvas.addEventListener('touchstart', function (evt) {
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
	}

	function loadTheme(themeName) {
		$loading.classList.remove('hidden');

		return load('json', 'themes/' + themeName + '.json').then(function (newTheme) {
			return Promise.all([
				load('img', 'img/' + newTheme.material.textures.diffuse),
				load('img', 'img/' + newTheme.material.textures.normal),
				load('img', 'img/' + newTheme.material.textures.specular)
			]).then(function (assets) {
				imgDiffuse = assets[0];
				imgNormal = assets[1];
				imgSpecular = assets[2];

				initTheme(newTheme);
				play();
			});
		}).catch(err => console.error(err));
	}

	var themeNames = [
		'realistic-day',
		'realistic-night',
		'abstract-blue',
		'abstract-blue2'
	];

	themeNames.forEach(function (themeName) {
		var o = document.createElement('option');
		o.value = themeName;
		o.textContent = themeName;
		$themeSelect.appendChild(o);
	});

	Promise.all([
		load('txt', 'shaders/default.vert'),
		load('txt', 'shaders/default.frag')
	]).then(function (shaders) {
		vertexShaderSource = shaders[0];
		fragmentShaderSource = shaders[1];

		initCommon();

		$themeSelect.addEventListener('change', function () {
			var themeName = $themeSelect.value;
			loadTheme(themeName);
		});

		loadTheme(themeNames[0]);
	});

})();
