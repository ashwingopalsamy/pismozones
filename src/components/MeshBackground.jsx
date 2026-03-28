import { useEffect, useRef } from 'react';

export function MeshBackground() {
  const blobsRef = useRef(null);

  // Scroll-linked parallax: mesh moves at 40% of scroll speed
  useEffect(() => {
    const main = document.querySelector('.main');
    if (!main || !blobsRef.current) return;
    let raf;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (blobsRef.current) {
          blobsRef.current.style.transform = `translateY(${main.scrollTop * 0.4}px)`;
        }
      });
    };
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-bg__blobs" ref={blobsRef}>
        <div className="mesh-blob mesh-blob--blue" />
        <div className="mesh-blob mesh-blob--amber" />
        <div className="mesh-blob mesh-blob--rose" />
        <div className="mesh-blob mesh-blob--indigo" />
      </div>
      <div className="mesh-bg__particles">
        <div className="mesh-particle mesh-particle--1" />
        <div className="mesh-particle mesh-particle--2" />
        <div className="mesh-particle mesh-particle--3" />
        <div className="mesh-particle mesh-particle--4" />
        <div className="mesh-particle mesh-particle--5" />
        <div className="mesh-particle mesh-particle--6" />
      </div>
    </div>
  );
}
