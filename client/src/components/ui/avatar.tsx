import { Image } from 'expo-image';
import * as React from 'react';
import { View, StyleSheet, type ImageSourcePropType } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof View> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-28 w-28 text-3xl',
};

const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100',
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps {
  source?: { uri?: string | null } | ImageSourcePropType | null;
  className?: string;
  onLoadingStatusChange?: (status: 'loading' | 'success' | 'error') => void;
}

function AvatarImage({ source, className, onLoadingStatusChange }: AvatarImageProps) {
  const uri = typeof source === 'object' && source !== null && 'uri' in source ? source.uri : null;

  if (!uri && !source) return null;

  return (
    <Image
      source={source as any}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={200}
      className={cn('h-full w-full', className)}
      onLoad={() => onLoadingStatusChange?.('success')}
      onError={() => onLoadingStatusChange?.('error')}
    />
  );
}
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof View> {
  children?: React.ReactNode;
  textClassName?: string;
}

function AvatarFallback({ className, textClassName, children, ...props }: AvatarFallbackProps) {
  return (
    <View
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-teal-600',
        className,
      )}
      {...props}>
      {typeof children === 'string' ? (
        <Text className={cn('font-bold text-white', textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
