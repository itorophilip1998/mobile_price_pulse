import { View, Text, StyleSheet } from 'react-native';

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): { level: PasswordStrengthLevel; score: number; label: string } {
  if (!password || password.length === 0) {
    return { level: 'weak', score: 0, label: '' };
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) return { level: 'weak', score, label: 'Weak' };
  if (score <= 3) return { level: 'fair', score, label: 'Fair' };
  if (score <= 5) return { level: 'good', score, label: 'Good' };
  return { level: 'strong', score, label: 'Strong' };
}

const LEVEL_COLORS: Record<PasswordStrengthLevel, string> = {
  weak: '#EF4444',
  fair: '#F59E0B',
  good: '#3B82F6',
  strong: '#10B981',
};

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { level, label } = getPasswordStrength(password);
  const isEmpty = !password || password.length === 0;

  const color = isEmpty ? '#9CA3AF' : LEVEL_COLORS[level];
  const segmentCount = isEmpty ? 0 : level === 'weak' ? 1 : level === 'fair' ? 2 : level === 'good' ? 3 : 4;

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i <= segmentCount && { backgroundColor: color },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>
        {isEmpty ? 'Password strength' : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
    minHeight: 32,
  },
  barRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
