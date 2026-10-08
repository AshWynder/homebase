import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Camera, Plus, Sparkles } from 'lucide-react-native';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUploadAvatar } from '@/hooks/queries/use-auth';
import { useStore } from '@/stores/use-store';

export function ProfilePhotoPicker() {
  const user = useStore((s) => s.user);
  const uploadAvatar = useUploadAvatar();
  const [isProcessing, setIsProcessing] = useState(false);

  const displayName = user?.name?.trim() || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handlePick = async (source: 'camera' | 'library') => {
    try {
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission required',
          `Please grant ${source === 'camera' ? 'camera' : 'photo library'} permissions in your device settings.`,
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsProcessing(true);
      const asset = result.assets[0];

      // Compress and resize to square avatar
      const context = ImageManipulator.manipulate(asset.uri).resize({ width: 600, height: 600 });
      const rendered = await context.renderAsync();
      const manipulated = await rendered.saveAsync({
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      const formData = new FormData();
      const fileName = `avatar-${Date.now()}.jpg`;

      if (Platform.OS === 'web') {
        const response = await fetch(manipulated.uri);
        const blob = await response.blob();
        formData.append('avatar', blob, fileName);
      } else {
        formData.append('avatar', {
          uri: manipulated.uri,
          name: fileName,
          type: 'image/jpeg',
        } as any);
      }

      await uploadAvatar.mutateAsync(formData);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not update profile photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const showOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handlePick('camera');
          if (buttonIndex === 2) handlePick('library');
        },
      );
    } else {
      Alert.alert('Change Profile Photo', 'Select an option', [
        { text: 'Take Photo', onPress: () => handlePick('camera') },
        { text: 'Choose from Library', onPress: () => handlePick('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const isLoading = isProcessing || uploadAvatar.isPending;

  return (
    <View className="items-center justify-center py-4">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={showOptions}
        disabled={isLoading}
        className="relative">
        <Avatar size="2xl" className="border-4 border-white shadow-md shadow-slate-200">
          {user?.image ? (
            <AvatarImage source={{ uri: user.image }} />
          ) : (
            <AvatarFallback className="bg-teal-700">
              <Text className="text-3xl font-bold text-white">{initials}</Text>
            </AvatarFallback>
          )}
        </Avatar>

        {isLoading ? (
          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : (
          <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-600 shadow-sm">
            <Icon as={Camera} size={16} className="text-white" />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={showOptions}
        disabled={isLoading}
        className="mt-2.5">
        <Text className="text-xs font-semibold text-teal-700">
          {user?.image ? 'Change Photo' : 'Add Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
