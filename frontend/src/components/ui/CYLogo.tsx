export function CYLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/codeyoung-logo.jpg"
      alt="CodeYoung"
      className={`object-contain rounded-lg ${className}`}
    />
  );
}
