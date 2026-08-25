import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const CalendarIcon = (props: IconProps) => <Icon {...props}><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></Icon>;
export const PlusIcon = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const CalendarCheckIcon = (props: IconProps) => <Icon {...props}><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><path d="m8.5 14.5 2 2 4.5-4.5" /></Icon>;
export const ArrivalIcon = (props: IconProps) => <Icon {...props}><path d="M4 19h16M5 14.5l14-6-1.3-2.8-5.6 1.6-4-3.3-2 .9 2.7 4-4.9 1.4Z" /></Icon>;
export const BedIcon = (props: IconProps) => <Icon {...props}><path d="M4 19v-8m16 8v-6a2 2 0 0 0-2-2H4m0 5h16M7 11V8h4a2 2 0 0 1 2 2v1" /></Icon>;
export const CheckIcon = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>;
