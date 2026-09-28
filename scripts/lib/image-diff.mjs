// Stand-in for remote images (the docs examples use https://github.com/mdo.png
// as an avatar), so a changed or unreachable image never shows up as a diff.
export const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="#6f42c1"/><circle cx="128" cy="100" r="48" fill="#e9d8fd"/>
  <rect x="48" y="164" width="160" height="92" rx="46" fill="#e9d8fd"/></svg>`

// Runs in the browser, through `page.evaluate(compareImages, [a, b, mirror])`,
// with two image URLs. Compares `b` (mirrored first, with `mirror`) with `a`
// pixel by pixel and draws the three side by side, differences in magenta.
// A pixel only counts as different when no pixel within 1px in the other image
// is close to it, so anti-aliasing on a border that lands half a pixel away
// doesn't count. Shared by the RTL render and scripts/diff-bootstrap.mjs.
export async function compareImages([first, second, mirror]) {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const [a, b] = await Promise.all([load(first), load(second)])
  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height)

  const pixels = (image, mirror) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (mirror) {
      context.translate(width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, width, height).data
  }

  const left = pixels(a, false)
  const right = pixels(b, mirror)
  const TOLERANCE = 48
  const close = (x, y, data, i) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue
        }

        const j = ((ny * width) + nx) * 4
        if (Math.abs(data[j] - left[i]) <= TOLERANCE && Math.abs(data[j + 1] - left[i + 1]) <= TOLERANCE && Math.abs(data[j + 2] - left[i + 2]) <= TOLERANCE) {
          return true
        }
      }
    }

    return false
  }

  const canvas = new OffscreenCanvas((width * 3) + 16, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(a, 0, 0)
  context.putImageData(new ImageData(right, width, height), width + 8, 0)
  const diff = context.createImageData(width, height)

  let different = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y * width) + x) * 4
      const differs = !close(x, y, right, i)
      if (differs) {
        different++
      }

      // Faded LTR screenshot, differences in magenta.
      const gray = 255 - ((255 - ((left[i] + left[i + 1] + left[i + 2]) / 3)) * 0.2)
      diff.data.set(differs ? [255, 0, 255, 255] : [gray, gray, gray, 255], i)
    }
  }

  context.putImageData(diff, (width * 2) + 16, 0)
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const image = await new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(blob)
  })

  return { ratio: different / (width * height), pixels: different, resized: a.width !== b.width || a.height !== b.height, image }
}
