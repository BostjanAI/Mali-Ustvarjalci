'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Blocks } from 'lucide-react';
export default function ProductImage({ src, title, priority = false, sizes = '(max-width: 760px) 50vw, 25vw' }: { src?: string; title: string; priority?: boolean; sizes?: string }) {
 const [failed,setFailed] = useState(false);
 return src && !failed ? <Image src={src} alt={title} fill sizes={sizes} priority={priority} onError={() => setFailed(true)}/> : <div className="product-no-image" role="img" aria-label={title}><Blocks aria-hidden="true"/></div>;
}
