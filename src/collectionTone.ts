import type { GraffitiTone } from './components/GraffitiLabel';

export function collectionTone(id: string): GraffitiTone {
  switch (id) {
    case 'greyscale':
      return 'yellow';
    case 'full-spectrum':
      return 'blue';
    case 'redscale':
      return 'orange';
    case 'people':
      return 'purple';
    default:
      return 'orange';
  }
}
