function update(stream) { 
  console.log(stream + ' is here');


  requestAnimationFrame(function () {
    update(stream);
  });
}

function init() { 
  window.navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) { 
      update(stream);
    })
    .catch(function (error) {
      throw new Error(error.name);
    });
}

init();
