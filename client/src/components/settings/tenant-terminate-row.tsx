import { FileMinus } from 'lucide-react-native';
import React, { useState } from 'react';

import { SettingsRow } from '@/components/settings/settings-row';
import { TerminateTenancyDialog } from '@/components/tenant/terminate-tenancy-dialog';
import type { ToastFunction } from '@/hooks/use-toast';
import { useTenancies } from '@/hooks/queries/use-tenancies';
import { useStore } from '@/stores/use-store';

interface TenantTerminateRowProps {
  showToast: ToastFunction;
}

/**
 * The lease-termination entry point, self-contained so it only mounts (and only
 * runs the tenancy query) for tenants. Renders nothing when there is no active
 * tenancy to terminate.
 */
export function TenantTerminateRow({ showToast }: TenantTerminateRowProps) {
  const profile = useStore((s) => s.profile);
  const [open, setOpen] = useState(false);

  const tenanciesQuery = useTenancies({ tenantId: profile?.id, isActive: true, limit: 1 });
  const activeTenancy = tenanciesQuery.data?.items?.[0];

  if (!activeTenancy) {
    return null;
  }

  const unitLabel = activeTenancy.unit?.unitNumber
    ? `Unit ${activeTenancy.unit.unitNumber}`
    : 'your unit';

  return (
    <>
      <SettingsRow
        icon={FileMinus}
        tone="destructive"
        title="Terminate tenancy"
        subtitle={`Send a move-out date and remarks for ${unitLabel}`}
        onPress={() => setOpen(true)}
      />

      <TerminateTenancyDialog
        open={open}
        onOpenChange={setOpen}
        tenancy={activeTenancy}
        onSuccess={(message) => showToast(message)}
        onError={(message) => showToast(message, 'error')}
      />
    </>
  );
}
