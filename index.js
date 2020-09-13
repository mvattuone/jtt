const Databender = require('databender');

const NOTES = [
  {
    frequency: 82.4069,
    name: 'e2',
    imageSrc: 'images/jtt-e2.jpg'
  },
  {
    frequency: 110, 
    name: 'a2',
    imageSrc: 'images/jtt-a2.jpg'
  },
  {
    frequency: 146.832,
    name: 'd3',
    imageSrc: 'images/jtt-d3.jpg'
  },
  {
    frequency: 195.998,
    name: 'g3',
    imageSrc: 'images/jtt-g3.jpg'
  },
  {
    frequency: 246.942,
    name: 'b3',
    imageSrc: 'images/jtt-b3.jpg'
  },
  {
    frequency: 329.628,
    name: 'e4',
    imageSrc: 'images/jtt-e4.jpg'
  }
]

function createImageFromConfig(note) {
  var img = new Image();
  img.addEventListener('load', () => {
    note.image = img;
  });
  img.src = note.imageSrc;
}

function getNoteDeviationInCents(frequency, targetFrequency) { 
  const frequencyInterval = frequency/targetFrequency;
  return 1200 * Math.log2(frequencyInterval);
}

function getFrequency() {
  var wavelength = 0;
  var correlogram = [];
  var bestLags = [];

  var rms = 0;
  for (let i = 0; i < waveform.length; i++) { 
    rms += waveform[i] * waveform[i]; 
  }

  rms = Math.sqrt(rms / waveform.length);

  if (rms < 0.01) { 
    return false;
  }

  for (let lag = -waveform.length; lag <= 0; lag++ ) {
    var xcorr = 0;

    for (let i = 0; i < waveform.length; i++) {
      xcorr += waveform[i] * (waveform[i - lag] || 0);
    }

    correlogram.push({
      lag: lag,
      value: xcorr
    });
  }

  var main_peak = correlogram[correlogram.length - 1];
  var peaks = [];
  for (let i = 0; i < waveform.length; i++) {
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

  var howOff = getNoteDeviationInCents(frequency, closestNote.frequency);
  tuneUp.classList.add('hidden');
  tuneDown.classList.add('hidden');

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

  databender.updateConfig('detune', 'value', howOff);

  databender.bend(closestNote.image, context, 0, 0, 0, 0, renderCanvas.width, renderCanvas.height);
}

function connectToSource(decodedBuffer) {
  source = audioCtx.createBufferSource();
  source.buffer = decodedBuffer;
  source.connect(analyserNode);
  source.loop = true;
  source.start(0);
  analyserNode.connect(audioCtx.destination);
  update(source);
};

function connectToMediaStreamSource(stream) { 
  console.log(stream);
  var microphone = audioCtx.createMediaStreamSource(stream);
  microphone.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);
  update(microphone);
};

function switchMethod() {
  // Play an mp3 file for quiet testing purposes
  if (USE_MP3) {
    if (stream) { 
      stream.getAudioTracks()[0].enabled = false;
    }
    fetch('audio/6th_String_E_64kb.mp3')
      .then(response => response.arrayBuffer())
      .then(buffer => audioCtx.decodeAudioData(buffer))
      .then(decodedBuffer => connectToSource(decodedBuffer)) 
      .catch(err => console.error(err)); 
  } else {
    if (source) {
      source.stop();
    }
    window.navigator.mediaDevices.getUserMedia({ audio: true })
      .then((s) => { 
        stream = s;
        return stream;
       })
      .then(connectToMediaStreamSource)
      .catch(err => console.error(err));
  }
}

let config = {
  detune: {
    active: true,
    areaOfEffect: 1,
    enableEnvelopes: false,
    enablePartial: false,
    randomize: false,
    randomValues: 2,
    value: 0
  }
}

let renderCanvas;
let context;
let audioCtx;
let analyserNode;
let waveform;
let databender;
let tuneUp;
let tuneDown;
let source;
let stream;

function main() { 
  renderCanvas = document.querySelector('#canvas');
  context = renderCanvas.getContext('2d');
  audioCtx = new AudioContext();
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  NOTES.forEach(createImageFromConfig);
  waveform = new Float32Array(analyserNode.fftSize);
  databender = new Databender(config, audioCtx);
  tuneUp = document.querySelector('.tuner-indicator-flat');
  tuneDown = document.querySelector('.tuner-indicator-sharp');


  document.querySelectorAll('input[name="method"]').forEach(function (elem) { 
    elem.addEventListener('click', function (e)  {
      if (e.target.classList.contains('mp3')) { 
        USE_MP3 = document.querySelector('input[type="radio"]:checked');
      } else {
        USE_MP3 = false;
      }
      switchMethod(audioCtx);
    });
  });


  switchMethod();
}

let USE_MP3 = true;

document.querySelector('.overlay').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.remove();
  main();
});
