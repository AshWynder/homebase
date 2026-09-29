import { useEffect, useState } from 'react';
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
import { useUpdateProperty } from '@/hooks/queries/use-properties';
import type { Property, UpdatePropertyInput } from '@/api/types';
import type { ToastFunction } from '@/hooks/use-toast';

interface UpdatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onToast: ToastFunction;
}

export function UpdatePropertyDialog({ open, onOpenChange, property, onToast }: UpdatePropertyDialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const updateProperty = useUpdateProperty();

  // Reset form when property changes or dialog opens
  useEffect(() => {
    if (property) {
      setName(property.name);
      setAddress(property.address || '');
    }
  }, [property]);

  const hasChanges = property && (name !== property.name || address !== (property.address || ''));

  const onSubmit = () => {
    if (!property || !name.trim()) return;
    const input: UpdatePropertyInput = { name: name.trim() };
    if (address.trim()) {
      input.address = address.trim();
    }
    updateProperty.mutate(
      { id: property.id, input },
      {
        onSuccess: () => {
          onToast('Property updated successfully', 'success');
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
          <DialogTitle>Update Property</DialogTitle>
          <DialogDescription>Update the property details.</DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          <View className="gap-2">
            <Label>Name</Label>
            <Input value={name} onChangeText={setName} placeholder="Sunset Apartments" />
          </View>
          <View className="gap-2">
            <Label>Address</Label>
            <Input value={address} onChangeText={setAddress} placeholder="123 Sunset Blvd, Nairobi" />
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={onSubmit}
            disabled={updateProperty.isPending || !name.trim() || !hasChanges}>
            <Text>{updateProperty.isPending ? 'Updating…' : 'Update'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
