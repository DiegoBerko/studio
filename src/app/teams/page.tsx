
// This page is no longer used as its functionality has been moved to
// the "Categorías y Equipos" tab within the /config page.
// This file can be safely deleted.

// To prevent build errors if it's still imported elsewhere temporarily,
// or to provide a redirect, you could do the following:

/*
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/config'); // Redirect to the config page where teams are now managed
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <p>Redirigiendo a la página de configuración...</p>
    </div>
  );
}
*/

// For now, let's leave it empty to indicate it's deprecated.
// If you confirm it's not imported anywhere, you can delete this file.
export default function DeprecatedTeamsPage() {
  return null;
}
