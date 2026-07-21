import React from 'react';
import * as Icons from 'lucide-react';

interface ProductIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const ProductIcon: React.FC<ProductIconProps> = ({ name, className = '', size = 24 }) => {
  // Safe lookup for Lucide icon
  const IconComponent = (Icons as any)[name];
  
  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }
  
  // Fallback icon
  return <Icons.Package className={className} size={size} />;
};
