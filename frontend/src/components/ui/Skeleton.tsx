import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ background: '#E2E8F0' }}
  />
);

export default Skeleton;
