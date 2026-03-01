'use client';

import RFPComplete from '@/components/RFPComplete';
import { emptyRFPData } from '@/types/rfp';

interface SharePageClientProps {
  rfpDocument: string;
  projectName: string;
}

export default function SharePageClient({ rfpDocument, projectName }: SharePageClientProps) {
  return (
    <RFPComplete
      rfpData={emptyRFPData}
      email={`shared-${projectName}`}
      preloadedPrd={rfpDocument}
      readOnly={true}
    />
  );
}
