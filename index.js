function update() { 
  requestAnimationFrame(update);
  console.log('inside the update loop');
}

function init() { 
  update();
}


init();
