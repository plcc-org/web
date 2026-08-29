import { getImage } from 'astro:assets'
import iconSource from '../assets/images/plcc-logo-icon.jpg'

// The one square-icon pipeline: the apple-touch icon (BaseLayout) and the PWA
// manifest icons are the same source image at different sizes, so they share
// the source and options here rather than each repeating them.
export function squareIcon(size: number) {
  return getImage({ src: iconSource, width: size, height: size, fit: 'cover', format: 'png' })
}
