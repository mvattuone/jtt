
function init() { 
  const NOTES = [
    {
      frequency: 82.4069,
      name: 'e2'
    },
    {
      frequency: 110, 
      name: 'a2'
    },
    {
      frequency: 146.832,
      name: 'd3'
    },
    {
      frequency: 195.998,
      name: 'g3'
    },
    {
      frequency: 246.942,
      name: 'b3'
    },
    {
      frequency: 329.628,
      name: 'e4'
    }
  ]

  function getNoteDeviationInCents(frequency, targetFrequency) { 
    frequencyInterval = frequency/targetFrequency;
    return 1200 * Math.log2(frequencyInterval);
  }

  function getFrequency() { 
    var wavelength = 0;
    var correlogram = [];
    var bestLags = [];

    var rms = 0;
    for (i = 0; i < waveform.length; i++) { 
      rms += waveform[i] * waveform[i]; 
    }

    rms = Math.sqrt(rms / waveform.length);

    if (rms < 0.01) { 
      return false;
    }

    for (lag = -waveform.length; lag < waveform.length; lag++ ) {
      var xcorr = 0;

      for (i = 0; i < waveform.length; i++) {
        xcorr += waveform[i] * (waveform[i - lag] || 0);
      }

      correlogram.push({
        lag: lag,
        value: xcorr
      });
    }

    var main_peak = correlogram[waveform.length];
    var peaks = [];
    for (i = 0; i < waveform.length; i++) {
      if (correlogram[i+1] && correlogram[i].value > correlogram[i+1].value && correlogram[i-1] && correlogram[i].value > correlogram[i-1].value) {
        peaks.push(correlogram[i]);
      }
    }

    const secondPeak = peaks.reduce(function(prev, current) {
        return (prev.value > current.value) ? prev : current
    })

    return audioCtx.sampleRate / Math.abs(main_peak.lag - secondPeak.lag); 
  }

  function update(stream) { 
    requestAnimationFrame(function () {
      update(stream);
    });

    analyserNode.getFloatTimeDomainData(waveform);
  
    var frequency = getFrequency(waveform);

    if (!frequency) {
      return;
    }

    var closestNote = NOTES.reduce(function (prev, current) {
      return (Math.abs(current.frequency - frequency) < Math.abs(prev.frequency - frequency)) ? current : prev
    });

    console.log('looks like you are playing a ' + closestNote.name);
    var howOff = getNoteDeviationInCents(frequency, closestNote.frequency);

    console.log('and you are about ' + howOff + ' cents off');
  }

  var audioCtx = new AudioContext();
  source = audioCtx.createBufferSource();
  var analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 4096;
  var waveform = new Float32Array(analyserNode.fftSize);

  // Sometimes its not possible to play a guitar or use the microphone
  // while developing. This bypasses that limitation.
  if (CANT_BE_LOUD) {
    fetch('3rd_String_G_64kb.mp3').then(function (response) {
      return response.arrayBuffer();
    }).then(function (buffer) {
      audioCtx.decodeAudioData(buffer, (decodedBuffer) => {
        source.buffer = decodedBuffer;
        source.connect(analyserNode);
        source.loop = true;
        source.start(0);
        analyserNode.connect(audioCtx.destination);
        update(source);
      });
    });
  } else {
    window.navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) { 
        var microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);
        update(microphone);
      })
      .catch(function (error) {
        console.log(error);
        throw new Error(error.name);
      });
  }
}

CANT_BE_LOUD = false;
init();
