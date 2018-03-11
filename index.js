
function init() { 
  const NOTES = [
    {
      frequency: 82.4069,
      name: 'e2',
      imageSrc: 'jtt-e2.jpg'
    },
    {
      frequency: 110, 
      name: 'a2',
      imageSrc: 'jtt-a2.jpg'
    },
    {
      frequency: 146.832,
      name: 'd3',
      imageSrc: 'jtt-d3.jpg'
    },
    {
      frequency: 195.998,
      name: 'g3',
      imageSrc: 'jtt-g3.jpg'
    },
    {
      frequency: 246.942,
      name: 'b3',
      imageSrc: 'jtt-b3.jpg'
    },
    {
      frequency: 329.628,
      name: 'e4',
      imageSrc: 'jtt-e4.jpg'
    }
  ]

  NOTES.forEach(function (note) {
    var img = new Image();
    img.addEventListener('load', () => {
      note.image = img;
    });
    img.src = note.imageSrc;
  });

  var renderCanvas = document.querySelector('#canvas');
  renderCanvas.width = window.innerWidth / 2;
  renderCanvas.height = window.innerHeight / 1.15;

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

    for (lag = -waveform.length; lag <= 0; lag++ ) {
      var xcorr = 0;

      for (i = 0; i < waveform.length; i++) {
        xcorr += waveform[i] * (waveform[i - lag] || 0);
      }

      correlogram.push({
        lag: lag,
        value: xcorr
      });
    }

    var main_peak = correlogram[correlogram.length - 1];
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
    var tuneUp = document.querySelector('.tuner-indicator-flat');
    var tuneDown = document.querySelector('.tuner-indicator-sharp');
    tuneUp.classList.add('hidden');
    tuneDown.classList.add('hidden');

    console.log('and you are about ' + howOff + ' cents off');
    
    if (Math.abs(howOff) < 5) {
     howOff = 0;
     document.querySelector('.' + closestNote.name).classList.remove('hidden');
    } else {
      if ( howOff < 0 ) {
        tuneUp.classList.remove('hidden');
      } else {
        tuneDown.classList.remove('hidden');
      }
     howOff /= 10;
     document.querySelectorAll('.text').forEach(function (node) {
       node.classList.add('hidden');
     });
    };

    databender.bend(closestNote.image, howOff)
      .then((renderedBuffer) => databender.draw(renderedBuffer, renderCanvas));
  }

  var audioCtx = new AudioContext();
  source = audioCtx.createBufferSource();
  var analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  var waveform = new Float32Array(analyserNode.fftSize);
  var databender = new Databender(audioCtx);

  // Play an mp3 file for quiet testing purposes
  if (CANT_BE_LOUD) {
    fetch('6th_String_E_64kb.mp3').then(function (response) {
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

CANT_BE_LOUD = true;
init();
