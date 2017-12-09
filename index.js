function update(stream) { 
  requestAnimationFrame(function () {
    update(stream);
  });
  console.log(stream + ' is here');
}

function init() { 
  window.navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) { 
      console.log('got user media');
      update(stream);
    })
    .catch(function (err) {
      console.log('error: ' + err);
    });
}


init();
