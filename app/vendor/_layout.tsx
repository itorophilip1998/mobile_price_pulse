import { Stack } from 'expo-router';

export default function VendorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-shop" />
      <Stack.Screen name="shop/[id]" />
      <Stack.Screen name="create-product" />
      <Stack.Screen name="edit-product/[id]" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="analytics/[shopId]" />
    </Stack>
  );
}
