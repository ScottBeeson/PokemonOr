// Tint decoded pixels before display so no frame can expose the original colors.
export function tintPixels(pixels) {
  const dark = [41, 69, 44];
  const light = [168, 186, 121];
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
    for (let channel = 0; channel < 3; channel++) {
      pixels[i + channel] = Math.round(dark[channel] + (light[channel] - dark[channel]) * luminance);
    }
  }
  return pixels;
}

export async function createLcdArtwork(source, { alt, className }) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  image.src = source;
  await image.decode();

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 144 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  tintPixels(data.data);
  context.putImageData(data, 0, 0);
  canvas.className = `lcd-art ${className}`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', alt);
  return canvas;
}
