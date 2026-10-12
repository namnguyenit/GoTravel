import React from 'react';

interface PortalPageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const PortalPageContainer: React.FC<PortalPageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
}) => {
  const maxWidthClass = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-[1440px]',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 ${maxWidthClass} ${className}`}>
      {children}
    </div>
  );
};
