import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';

interface GradientTextProps {
  colors?: string[];
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function GradientText({ 
  colors = ['#667eea', '#764ba2'], 
  style, 
  children,
}: GradientTextProps) {
  // Use the first gradient color as a solid color
  // This avoids MaskedView issues that can cause blank screens
  // The gradient effect can be added later once the app is stable
  try {
    const textStyle = StyleSheet.flatten(style) || {};
    
    return (
      <Text style={[textStyle, { color: colors[0] || '#667eea' }]}>
        {children}
      </Text>
    );
  } catch (error) {
    // Fallback to ensure component always renders
    return (
      <Text style={[style, { color: '#667eea' }]}>
        {children}
      </Text>
    );
  }
}
