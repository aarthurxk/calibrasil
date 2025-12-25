import { useMemo } from 'react';

interface UseStaggerAnimationOptions {
  baseDelay?: number;
  staggerDelay?: number;
  animation?: string;
}

export const useStaggerAnimation = (
  index: number,
  options: UseStaggerAnimationOptions = {}
) => {
  const { baseDelay = 0, staggerDelay = 100, animation = 'animate-fade-in-up' } = options;

  const style = useMemo(
    () => ({
      animationDelay: `${baseDelay + index * staggerDelay}ms`,
      opacity: 0,
    }),
    [baseDelay, index, staggerDelay]
  );

  return { className: animation, style };
};

export const getStaggerStyle = (
  index: number,
  baseDelay: number = 0,
  staggerDelay: number = 100
) => ({
  animationDelay: `${baseDelay + index * staggerDelay}ms`,
  opacity: 0,
});

export default useStaggerAnimation;
