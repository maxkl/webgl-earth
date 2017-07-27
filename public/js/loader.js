(function (loader) {
	'use strict';

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
		},
		'json': function (url) {
			return loaders['txt'](url).then(function (json) {
				return JSON.parse(json);
			});
		}
	};

	loader.load = function (type, url) {
		return loaders[type](url);
	}

})(window);
