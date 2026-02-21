import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { ActionList } from '@/types';

type PickerValue = ActionList | null;

type ListPickerProps = {
  value: PickerValue;
  onChange: (value: PickerValue) => void;
};

type Option = {
  label: string;
  value: PickerValue;
};

const OPTIONS: Option[] = [
  { label: 'None', value: null },
  { label: 'Perso', value: ActionList.Perso },
  { label: 'Pro', value: ActionList.Pro },
];

function isSelectedOption(selected: PickerValue, candidate: PickerValue): boolean {
  return selected === candidate;
}

export default function ListPicker({ value, onChange }: ListPickerProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const selected = isSelectedOption(value, option.value);

        return (
          <Pressable
            key={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    padding: 4,
    gap: 6,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  segmentSelected: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  segmentPressed: {
    opacity: 0.9,
  },
  segmentText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: theme.colors.text,
  },
});
