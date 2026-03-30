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
    const isPaste = numericText.length > 1;

    if (isPaste) {
      // Paste: spread digits across all boxes (handles "123456", "123 456", "12-34-56")
      const digits = numericText.slice(0, length).split('');
      const newOtp = Array(length).fill('');
      digits.forEach((char, i) => {
        if (i < length) newOtp[i] = char;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(digits.length, length) - 1;
      setTimeout(() => {
        inputRefs.current[Math.max(0, lastIndex)]?.focus();
      }, 50);
      if (digits.length >= length) {
        setTimeout(() => onComplete(newOtp.join('')), 100);
      }
      return;
    }

    // Single character (typing)
    const digit = numericText.slice(-1); // only take last char in case of any edge case
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== '')) {
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
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
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
              maxLength={length}
              selectTextOnFocus
              editable={!disabled}
              autoFocus={autoFocus && index === 0}
              // Enable paste support
              contextMenuHidden={false}
            />
        ))}
      </View>
      {/* {!disabled && (
        <TouchableOpacity onPress={clearOTP} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      )} */}
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
    paddingHorizontal: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 48,
    maxWidth: 56,
    height: 64,
    borderWidth: 1,
    borderColor: '#D1D5DB',
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

