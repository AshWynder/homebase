import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useCreateUnit } from '@/hooks/queries/use-units';
import type { ToastFunction } from '@/hooks/use-toast';

interface CreateUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onToast: ToastFunction;
}

export function CreateUnitDialog({
  open,
  onOpenChange,
  propertyId,
  onToast,
}: CreateUnitDialogProps) {
  const [unitNumber, setUnitNumber] = useState('');
  const [blockName, setBlockName] = useState('');
  const createUnit = useCreateUnit();

  const onSubmit = () => {
    if (!unitNumber.trim()) return;
    createUnit.mutate(
      {
        unitNumber: unitNumber.trim(),
        blockName: blockName.trim() || undefined,
        propertyId,
      },
      {
        onSuccess: () => {
          onToast('Unit created successfully', 'success');
          setUnitNumber('');
          setBlockName('');
          onOpenChange(false);
        },
        onError: (error) => {
          onToast((error as Error).message, 'error');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Unit</DialogTitle>
          <DialogDescription>Add a new unit to this property.</DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Unit Number</Label>
            <Input
              value={unitNumber}
              onChangeText={setUnitNumber}
              placeholder="101"
              editable={!createUnit.isPending}
            />
          </View>
          <View className="gap-2">
            <Label>Block Name (optional)</Label>
            <Input
              value={blockName}
              onChangeText={setBlockName}
              placeholder="Block A"
              editable={!createUnit.isPending}
            />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={onSubmit}
            disabled={createUnit.isPending || !unitNumber.trim()}>
            <Text>{createUnit.isPending ? 'Creating…' : 'Create'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
