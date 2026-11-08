/**
 * Optimización de imágenes servidas desde Cloudinary: se pide el ancho
 * necesario y el mejor formato/calidad (f_auto,q_auto). Las URLs que no son de
 * Cloudinary se devuelven sin cambios.
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** URL de la imagen con el ancho indicado (solo Cloudinary). */
export function imageAt(url: string, width: number): string {
  const m = CLOUDINARY_UPLOAD.exec(url);
  if (!m) return url;
  const [, prefix, rest] = m;
  // Si ya trae transformaciones (no empieza por la versión v123 ni la carpeta
  // típica), se respetan y no se vuelven a aplicar.
  const first = rest.split('/')[0];
  if (/^[a-z]{1,3}_[^/]*$/.test(first) && !/^v\d+$/.test(first)) return url;
  return `${prefix}f_auto,q_auto,w_${width}/${rest}`;
}

/** srcset con varios anchos (solo Cloudinary); vacío para otras URLs. */
export function imageSrcset(url: string, widths: number[]): string {
  if (!CLOUDINARY_UPLOAD.test(url)) return '';
  return widths.map((w) => `${imageAt(url, w)} ${w}w`).join(', ');
}
