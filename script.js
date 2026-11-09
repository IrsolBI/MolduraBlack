const canvas = document.getElementById('avatar');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('foto');
const zoom = document.getElementById('zoom');
const zoomValue = document.getElementById('zoomValue');
const gerar = document.getElementById('gerar');
const baixar = document.getElementById('baixar');
const status = document.getElementById('status');
const moldura = new Image();

const state = {
  foto: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  drag: null,
  generated: false,
};

moldura.src = 'moldura.png';

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPhotoDimensions() {
  if (!state.foto) {
    return { width: 0, height: 0 };
  }

  const maxDimension = Math.max(state.foto.width, state.foto.height);
  const baseScale = (canvas.width * 0.82) / maxDimension;
  return {
    width: state.foto.width * baseScale * state.scale,
    height: state.foto.height * baseScale * state.scale,
  };
}

function getMovementLimits() {
  const { width, height } = getPhotoDimensions();
  const radius = canvas.width * 0.407;
  const maxX = Math.max(0, (width - radius * 2) / 2);
  const maxY = Math.max(0, (height - radius * 2) / 2);
  return { maxX, maxY };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.foto) {
    const { width, height } = getPhotoDimensions();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = centerX - width / 2 + state.offsetX;
    const y = centerY - height / 2 + state.offsetY;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, canvas.width * 0.407, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(state.foto, x, y, width, height);
    ctx.restore();
  }

  if (moldura.complete && moldura.naturalWidth > 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
}

function refreshZoomValue() {
  zoomValue.textContent = `${Number(state.scale).toFixed(2)}x`;
}

function normalizeImage(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    setStatus('Arquivo inválido. Escolha uma imagem em JPG, PNG ou WebP.', true);
    upload.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();

    img.onload = () => {
      state.foto = img;
      state.scale = 1;
      state.offsetX = 0;
      state.offsetY = 0;
      state.generated = false;
      zoom.value = '1';
      refreshZoomValue();
      gerar.disabled = false;
      baixar.classList.add('hidden');
      setStatus('Imagem carregada. Ajuste o zoom e arraste para enquadrar a foto.');
      render();
    };

    img.onerror = () => {
      setStatus('Não foi possível abrir esta imagem. Tente outra foto.', true);
      gerar.disabled = true;
    };

    img.src = event.target.result;
  };

  reader.onerror = () => {
    setStatus('O arquivo não pôde ser lido. Tente novamente.', true);
  };

  reader.readAsDataURL(file);
}

upload.addEventListener('change', () => {
  const file = upload.files[0];
  normalizeImage(file);
});

zoom.addEventListener('input', (event) => {
  state.scale = Number(event.target.value);
  refreshZoomValue();
  const { maxX, maxY } = getMovementLimits();
  state.offsetX = clamp(state.offsetX, -maxX, maxX);
  state.offsetY = clamp(state.offsetY, -maxY, maxY);
  state.generated = false;
  baixar.classList.add('hidden');
  render();
});

canvas.addEventListener('pointerdown', (event) => {
  if (!state.foto) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const localX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const localY = (event.clientY - rect.top) * (canvas.height / rect.height);

  state.drag = {
    startX: event.clientX,
    startY: event.clientY,
    originalOffsetX: state.offsetX,
    originalOffsetY: state.offsetY,
    pointerX: localX,
    pointerY: localY,
  };

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!state.drag || !state.foto) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const deltaX = (event.clientX - state.drag.startX) * (canvas.width / rect.width);
  const deltaY = (event.clientY - state.drag.startY) * (canvas.height / rect.height);
  const { maxX, maxY } = getMovementLimits();

  state.offsetX = clamp(state.drag.originalOffsetX + deltaX, -maxX, maxX);
  state.offsetY = clamp(state.drag.originalOffsetY + deltaY, -maxY, maxY);
  state.generated = false;
  baixar.classList.add('hidden');
  render();
});

function stopDrag() {
  state.drag = null;
}

function triggerDownload() {
  if (!state.foto) {
    setStatus('Selecione uma foto antes de gerar o avatar.', true);
    return;
  }

  render();

  const trigger = () => {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'avatar-black-da-obra.png';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    baixar.href = url;
    baixar.classList.remove('hidden');
  };

  if (canvas.toBlob) {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus('Não foi possível gerar a imagem PNG. Tente novamente.', true);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'avatar-black-da-obra.png';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        baixar.href = url;
        baixar.classList.remove('hidden');
        setStatus('Avatar pronto! O download em PNG 1080x1080 está disponível.');
      },
      'image/png'
    );
  } else {
    trigger();
    setStatus('Avatar pronto! O download em PNG 1080x1080 está disponível.');
  }
}

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('pointerleave', stopDrag);

['dragenter', 'dragover'].forEach((eventName) => {
  canvas.addEventListener(eventName, (event) => {
    event.preventDefault();
    canvas.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  canvas.addEventListener(eventName, (event) => {
    event.preventDefault();
    canvas.classList.remove('drag-over');
  });
});

canvas.addEventListener('drop', (event) => {
  const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
  normalizeImage(file);
});

gerar.addEventListener('click', () => {
  triggerDownload();
});

baixar.addEventListener('click', (event) => {
  event.preventDefault();
  triggerDownload();
});

moldura.onload = render;
zoomValue.textContent = '1.00x';
render();

