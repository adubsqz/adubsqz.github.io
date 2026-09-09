export type GraffitiTone = 'blue' | 'pink' | 'orange' | 'yellow' | 'purple';

interface GraffitiLabelProps {
  text: string;
  on?: boolean;
  tone?: GraffitiTone;
}

export default function GraffitiLabel({ text, on = false, tone = 'orange' }: GraffitiLabelProps) {
  return (
    <span
      className={on ? 'graffiti-label graffiti-label--on' : 'graffiti-label'}
      data-tone={tone}
    >
      <span className="graffiti-label__throw" aria-hidden="true">
        {text}
      </span>
      <span className="graffiti-label__core">{text}</span>
    </span>
  );
}
