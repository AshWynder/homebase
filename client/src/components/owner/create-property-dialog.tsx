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
import { useCreateProperty } from '@/hooks/queries/use-properties';

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
}

export function CreatePropertyDialog({ open, onOpenChange, ownerId }: CreatePropertyDialogProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const createProperty = useCreateProperty();

  const onSubmit = () => {
    if (!name.trim()) return;
    createProperty.mutate(
      { name: name.trim(), address: address.trim() || undefined, ownerId },
      {
        onSuccess: () => {
          setName('');
          setAddress('');
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Property</DialogTitle>
          <DialogDescription>Add a property to start managing its units.</DialogDescription>
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
          {createProperty.isError ? (
            <Text className="text-sm text-red-600">
              {(createProperty.error as Error).message}
            </Text>
          ) : null}
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={onSubmit} disabled={createProperty.isPending || !name.trim()}>
            <Text>{createProperty.isPending ? 'Creating…' : 'Create'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}