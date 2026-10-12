import React from 'react';

interface CustomerPageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const CustomerPageContainer: React.FC<CustomerPageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
}) => {
  const maxWidthClass = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-[1200px]',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className={`w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 ${maxWidthClass} ${className}`}>
      {children}
    </div>
  );
};
