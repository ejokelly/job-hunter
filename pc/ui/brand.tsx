import Image from 'next/image';
import Link from 'next/link';

interface BrandProps {
  className?: string;
}

export default function Brand({ className = '' }: BrandProps) {
  return (
    <div className={`w-full flex justify-center items-center ${className}`}>
      <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
        <Image
          src="/favicon-32x32.png"
          alt="resume love"
          width={32}
          height={32}
          className="mr-1 translate-y-[2px]"
        />
        <span><span className="font-normal">resume</span><span className="font-bold">love</span></span>
      </Link>
    </div>
  );
}