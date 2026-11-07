/**
 * "Crea tu propia camiseta" — modal de personalización cargado dinámicamente.
 *
 * Se importa con dynamic import() SOLO al pulsar el botón, así Konva y este
 * código no entran en el bundle inicial de la página. Monta un modal con un
 * lienzo (el área de diseño "dise" en px), permite subir una imagen y
 * moverla/escalarla (proporcional), elegir color, y al generar renderiza la
 * sesión completa del color seleccionado reemplazando el marquee.
 */
import Konva from 'konva';

import {
  previewCustomSession,
  uploadCustomImage,
  type CustomRenderParams,
} from './storefront';
import type { StorefrontCustomization } from './types';

interface OpenOptions {
  customization: StorefrontCustomization;
  productName: string;
  /** Color activo del detalle, leído al momento de generar. */
  getActiveColorId: () => string | null;
  /** Hex del color activo (para tintar de forma fiable). */
  getActiveColorHex: () => string | null;
  /**
   * Éxito del preview GRATIS: primera imagen renderizada + total de mockups
   * de la sesión + los parámetros usados, para que la página muestre el gate
   * de registro y luego pueda renderizar el resto sin reabrir el modal.
   */
  onRendered: (result: {
    images: string[];
    totalMockups: number;
    imageUrl: string;
    placement: CustomRenderParams['placement'];
  }) => void;
}

/** Lee un File como data URI. */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read error'));
    reader.readAsDataURL(file);
  });
}

/** Carga una imagen del DOM (para Konva). */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load error'));
    img.src = url;
  });
}

export function openCustomDesigner(opts: OpenOptions): void {
  const {
    customization,
    productName,
    getActiveColorId,
    getActiveColorHex,
    onRendered,
  } = opts;
  const areaW = customization.areaWidthPx || 500;
  const areaH = customization.areaHeightPx || 500;

  // --- Estructura del modal ---
  const overlay = document.createElement('div');
  overlay.className = 'cd-overlay';
  overlay.innerHTML = `
    <div class="cd-backdrop" data-close></div>
    <div class="cd-modal" role="dialog" aria-modal="true" aria-label="Crea tu propia camiseta">
      <div class="cd-head">
        <div>
          <h2 class="cd-title">Crea tu propia camiseta</h2>
          <p class="cd-sub">${productName}</p>
        </div>
        <button type="button" class="cd-close" data-close aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="cd-body">
        <div class="cd-stage-wrap">
          <div class="cd-stage" data-stage></div>
          <!-- Overlay con botón centrado de carga (cuando no hay imagen). -->
          <label class="cd-upload-overlay" data-upload-label>
            <input type="file" accept="image/*" data-file hidden />
            <span class="cd-upload-btn" data-upload-text>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Cargar imagen
            </span>
          </label>
          <div class="cd-hint" data-hint hidden>
            Arrastra para mover · usa las esquinas para escalar
          </div>
        </div>
        <button type="button" class="cd-generate" data-generate disabled>
          Ver en la camiseta
        </button>
        <p class="cd-error" data-error hidden></p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  // Transición de entrada.
  requestAnimationFrame(() => overlay.classList.add('open'));

  // --- Estado ---
  let uploadedUrl: string | null = null;
  let generating = false;

  const stageEl = overlay.querySelector<HTMLElement>('[data-stage]')!;
  const fileInput = overlay.querySelector<HTMLInputElement>('[data-file]')!;
  const uploadLabel =
    overlay.querySelector<HTMLElement>('[data-upload-label]')!;
  const uploadText = overlay.querySelector<HTMLElement>('[data-upload-text]')!;
  const hintEl = overlay.querySelector<HTMLElement>('[data-hint]')!;
  const generateBtn =
    overlay.querySelector<HTMLButtonElement>('[data-generate]')!;
  const errorEl = overlay.querySelector<HTMLElement>('[data-error]')!;

  // --- Lienzo Konva: representa el área "dise" en px (escalado a pantalla) ---
  const CANVAS_W = 340;
  const scale = CANVAS_W / areaW;
  const stage = new Konva.Stage({
    container: stageEl,
    width: areaW * scale,
    height: areaH * scale,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  // Fondo del área.
  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: areaW * scale,
      height: areaH * scale,
      fill: '#ffffff',
      stroke: '#d4d4d4',
      dash: [4, 4],
    }),
  );
  layer.draw();

  let konvaImg: Konva.Image | null = null;
  let transformer: Konva.Transformer | null = null;

  function setError(msg: string | null) {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    } else {
      errorEl.hidden = true;
    }
  }

  function syncGenerateEnabled() {
    generateBtn.disabled = generating || !uploadedUrl || !konvaImg;
  }

  // Coloca la imagen en el lienzo (centrada, "contain" al área).
  async function placeImageOnCanvas(url: string, natW: number, natH: number) {
    const img = await loadImage(url);
    const ratio = Math.min((areaW * 0.6) / natW, (areaH * 0.6) / natH, 1);
    const w = natW * ratio * scale;
    const h = natH * ratio * scale;

    if (konvaImg) konvaImg.destroy();
    if (transformer) transformer.destroy();

    konvaImg = new Konva.Image({
      image: img,
      x: (areaW * scale - w) / 2,
      y: (areaH * scale - h) / 2,
      width: w,
      height: h,
      draggable: true,
    });
    layer.add(konvaImg);

    transformer = new Konva.Transformer({
      nodes: [konvaImg],
      rotateEnabled: true,
      keepRatio: true,
      enabledAnchors: [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ],
      boundBoxFunc: (oldBox, newBox) =>
        newBox.width < 10 || newBox.height < 10 ? oldBox : newBox,
    });
    layer.add(transformer);
    layer.draw();
    syncGenerateEnabled();
  }

  // --- Subida de imagen ---
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    setError(null);
    uploadText.innerHTML = 'Subiendo…';
    uploadLabel.classList.add('loading');
    try {
      const dataUri = await fileToDataUri(file);
      const uploaded = await uploadCustomImage(dataUri);
      if (!uploaded) throw new Error('No se pudo subir la imagen.');
      uploadedUrl = uploaded.url;
      await placeImageOnCanvas(uploaded.url, uploaded.width, uploaded.height);
      // Hay imagen: el overlay pasa a modo "cambiar" (discreto) y se ve el
      // lienzo con la imagen para mover/escalar.
      uploadLabel.classList.add('has-image');
      uploadLabel.classList.remove('loading');
      uploadText.textContent = 'Cambiar imagen';
      hintEl.hidden = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir.');
      uploadLabel.classList.remove('loading');
    }
  });

  // --- Generar: convierte geometría del lienzo a px del smart object ---
  async function generate() {
    if (!uploadedUrl || !konvaImg || generating) return;
    generating = true;
    syncGenerateEnabled();
    generateBtn.textContent = 'Generando…';
    overlay.classList.add('rendering');
    setError(null);

    // Geometría absoluta del nodo (incluye escala del transformer), en px
    // de pantalla -> dividir por `scale` para px del smart object.
    const box = konvaImg.getClientRect({ relativeTo: layer });
    const placement: CustomRenderParams['placement'] = {
      xPx: box.x / scale,
      yPx: box.y / scale,
      widthPx: box.width / scale,
      heightPx: box.height / scale,
      rotation: konvaImg.rotation() || 0,
    };

    try {
      // Preview GRATIS: solo la primera imagen (sin registro). El resto se
      // desbloquea registrándose (gate manejado por la página).
      const { images, totalMockups } = await previewCustomSession({
        productId: customization.productId,
        sessionId: customization.sessionId,
        imageUrl: uploadedUrl,
        designSmartObjectUuid: customization.designSmartObjectUuid,
        placement,
        colorId: getActiveColorId() ?? undefined,
        colorHex: getActiveColorHex() ?? undefined,
      });
      if (images.length === 0) {
        throw new Error('No se generó ninguna imagen.');
      }
      onRendered({ images, totalMockups, imageUrl: uploadedUrl, placement });
      // Éxito: cierra el modal (la vista previa ya reemplazó el marquee).
      close();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo generar la vista.',
      );
      generating = false;
      overlay.classList.remove('rendering');
      generateBtn.textContent = 'Ver en la camiseta';
      syncGenerateEnabled();
    }
  }
  generateBtn.addEventListener('click', generate);

  // --- Cierre ---
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      stage.destroy();
      overlay.remove();
    }, 260);
  }
  overlay
    .querySelectorAll('[data-close]')
    .forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
}
