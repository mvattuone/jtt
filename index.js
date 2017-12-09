
function init() { 
  function isZero(element) { 
    return element === 0;
  }

  function update(stream) { 
    analyserNode.getFloatTimeDomainData(waveform);
  
    if (!waveform.every(isZero)) {
      console.log('there is analyzed sound');
    } else {
      console.log('no sound to analyze :'(');
    }

    requestAnimationFrame(function () {
      update(stream);
    });
  }

  var audioCtx = new AudioContext();
  var analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 1024;
  var waveform = new Float32Array(analyserNode.fftSize);
  window.navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function (stream) { 
      var microphone = audioCtx.createMediaStreamSource(stream);
      microphone.connect(analyserNode);
      update(microphone);
    })
    .catch(function (error) {
      throw new Error(error.name);
    });
}

init();
