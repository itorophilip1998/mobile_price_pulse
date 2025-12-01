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
      // Handle paste - extract only numbers and take first 'length' digits
      const pastedText = numericText.slice(0, length);
      const newOtp = Array(length).fill('');
      
      // Fill OTP array with pasted digits
      pastedText.split('').forEach((char, i) => {
        if (i < length) {
          newOtp[i] = char;
        }
      });
      
      setOtp(newOtp);
      
      // Focus on the last filled input or the last input
      const lastFilledIndex = Math.min(pastedText.length - 1, length - 1);
      setTimeout(() => {
        inputRefs.current[lastFilledIndex]?.focus();
      }, 50);
      
      // Check if complete and auto-submit
      if (pastedText.length === length && pastedText.split('').every((char) => char !== '')) {
        setTimeout(() => {
          onComplete(pastedText);
        }, 100);
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
              maxLength={1}
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

