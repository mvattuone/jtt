    // Create a Databender instance
    var Databender = function (audioCtx, renderCanvas) {

      // Create an AudioContext or use existing one
      this.audioCtx = audioCtx ? audioCtx : new AudioContext();
      this.renderCanvas = renderCanvas;
      
      this.channels = 1; // @TODO - What would multiple channels look like?

      this.bend = function (image, detuneValue) {
        if (image instanceof Image || image instanceof HTMLVideoElement) {
          var canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 768;
          var context = canvas.getContext('2d');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        this.imageData = imageData || image;
        this.detuneValue = detuneValue || 0;
        var bufferSize = this.imageData.data.length / this.channels;

        // Make an audioBuffer on the audioContext to pass to the offlineAudioCtx AudioBufferSourceNode
        var audioBuffer = this.audioCtx.createBuffer(this.channels, bufferSize, this.audioCtx.sampleRate); 

        // This gives us the actual ArrayBuffer that contains the data
        var nowBuffering = audioBuffer.getChannelData(0);

        // set the AudioBuffer buffer to the same as the imageData audioBuffer
        // v. convenient becuase you do not need to convert the data yourself
        nowBuffering.set(this.imageData.data);

        return Promise.resolve(audioBuffer); 
      }

      this.render = function (buffer) {
        var _this = this;
        return new Promise(function (resolve, reject) {

          // Create offlineAudioCtx that will house our rendered buffer
          var offlineAudioCtx = new OfflineAudioContext(_this.channels, buffer.length, _this.audioCtx.sampleRate);

          console.log(buffer.getChannelData(0));
          // Create an AudioBufferSourceNode, which represents an audio source consisting of in-memory audio data
          var bufferSource = offlineAudioCtx.createBufferSource();

          // Set buffer to audio buffer containing image data
          bufferSource.buffer = buffer; 
          bufferSource.detune.value = _this.detuneValue;

          //  @NOTE: Calling this is when the AudioBufferSourceNode becomes unusable
          bufferSource.start();

          bufferSource.connect(offlineAudioCtx.destination);

          // Kick off the render, callback will contain rendered buffer in event
          offlineAudioCtx.startRendering();
          // Render the databent image.
          offlineAudioCtx.oncomplete = function (e) {
            resolve(e.renderedBuffer);
          };
        });
      };

      this.draw = function (buffer) {

        // Get buffer data
        var bufferData = buffer.getChannelData(0);

        // ImageData expects a Uint8ClampedArray so we need to make a typed array from our buffer
        // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        var clampedDataArray = new Uint8ClampedArray(buffer.length)

        // set the renderedBuffer to Uint8ClampedArray to use in ImageData later
        clampedDataArray.set(bufferData);

        // putImageData requires an ImageData Object
        // @see https://developer.mozilla.org/en-US/docs/Web/API/ImageData
        var transformedImage = new ImageData(clampedDataArray, this.imageData.width, this.imageData.height);

       this.renderCanvas.getContext('2d').putImageData(transformedImage, 0, 0);
      };


      return this;
    };
