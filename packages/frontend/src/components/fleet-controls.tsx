import { Primitive } from '@radix-ui/react-primitive';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Button({ className, ...props }: ComponentProps<typeof Primitive.button>) {
  return <Primitive.button type="button" className={cn(
    'inline-flex items-center justify-center gap-200 rounded-md border border-border bg-card px-300 py-200 font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
    className,
  )} {...props} />;
}

export function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return <label className="flex min-w-(--width-control) flex-1 flex-col gap-100 text-200 font-semibold text-muted-foreground">
    {label}
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger aria-label={label} className="inline-flex items-center justify-between gap-300 rounded-md border border-input bg-card px-300 py-200 text-300 font-regular text-foreground hover:bg-accent">
        <Select.Value /><Select.Icon><ChevronDown className="icon-size-200" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-[2000] max-h-80 min-w-(--radix-select-trigger-width) overflow-auto rounded-md border border-border bg-popover text-300 text-popover-foreground shadow-lg">
          <Select.Viewport className="p-100">
            {options.map((option) => <Select.Item key={option.value} value={option.value}
              className="relative cursor-pointer rounded-sm py-200 pl-700 pr-400 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
              <Select.ItemIndicator className="absolute left-200"><Check className="icon-size-200" /></Select.ItemIndicator>
              <Select.ItemText>{option.label}</Select.ItemText>
            </Select.Item>)}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </label>;
}
