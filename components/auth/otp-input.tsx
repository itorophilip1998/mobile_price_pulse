import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function OTPInput({
  length = 6,
  onComplete,
  autoFocus = true,
  disabled = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) {
      // Handle paste
      const pastedText = numericText.slice(0, length);
      const newOtp = [...otp];
      pastedText.split('').forEach((char, i) => {
        if (index + i < length) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus on the next empty input or the last one
      const nextIndex = Math.min(index + pastedText.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      // Check if complete
      if (newOtp.every((digit) => digit !== '')) {
        onComplete(newOtp.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    // Auto-focus next input
    if (numericText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((digit) => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focused
    inputRefs.current[index]?.setNativeProps({ selection: { start: 0, end: otp[index].length } });
  };

  const clearOTP = () => {
    setOtp(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.input,
              digit ? styles.inputFilled : null,
              disabled && styles.inputDisabled,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!disabled}
            autoFocus={autoFocus && index === 0}
          />
        ))}
      </View>
      {!disabled && (
        <TouchableOpacity onPress={clearOTP} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#F3F4F6',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});

