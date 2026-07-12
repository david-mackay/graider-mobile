import Svg, { Path } from 'react-native-svg';

type IconProps = { className?: string; color?: string };

function getSize(className?: string): number {
  if (!className) return 24;
  if (className.includes('h-3') || className.includes('w-3')) return 12;
  if (className.includes('h-4') || className.includes('w-4')) return 16;
  if (className.includes('h-5') || className.includes('w-5')) return 20;
  if (className.includes('h-6') || className.includes('w-6')) return 24;
  if (className.includes('h-7') || className.includes('w-7')) return 28;
  return 24;
}

function getColor(className?: string, color?: string): string {
  if (color) return color;
  if (!className) return '#6f6151';
  if (className.includes('text-white')) return '#fffcf5';
  if (className.includes('text-pen-deep')) return '#99291f';
  if (className.includes('text-pen')) return '#be3a2e';
  if (className.includes('text-moss')) return '#4a7c59';
  if (className.includes('text-moss-deep')) return '#38613f';
  if (className.includes('text-ink-faint')) return '#a3927b';
  if (className.includes('text-ink-soft')) return '#6f6151';
  if (className.includes('text-ink')) return '#2c231b';
  if (className.includes('text-marigold')) return '#b07a21';
  return '#6f6151';
}

export function IconHome({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </Svg>
  );
}

export function IconBook({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </Svg>
  );
}

export function IconClipboard({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </Svg>
  );
}

export function IconUsers({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </Svg>
  );
}

export function IconPen({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </Svg>
  );
}

export function IconMenu({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </Svg>
  );
}

export function IconX({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </Svg>
  );
}

export function IconCheck({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={2.5}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </Svg>
  );
}

export function IconCopy({ className, color }: IconProps) {
  const size = getSize(className);
  const stroke = getColor(className, color);
  return (
    <Svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={1.8}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </Svg>
  );
}

/** @deprecated Use IconPen for grade-stack actions */
export function IconSparkle({ className, color }: IconProps) {
  return <IconPen className={className} color={color} />;
}
